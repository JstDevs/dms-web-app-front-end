import { createWorker, Worker } from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker?worker';

// @ts-ignore
GlobalWorkerOptions.workerPort = new PdfJsWorker();

/**
 * Parse HOCR (HTML OCR) format to extract word-level data with bounding boxes
 */
function parseHOCR(hocr: string): OCRWord[] {
  const words: OCRWord[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(hocr, 'text/html');
    
    // HOCR uses <span class="ocrx_word"> with title attribute containing bbox
    const wordSpans = doc.querySelectorAll('.ocrx_word');
    
    wordSpans.forEach((span) => {
      const title = span.getAttribute('title');
      if (title) {
        // Title format: "bbox x0 y0 x1 y1; ..."
        const bboxMatch = title.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
        if (bboxMatch) {
          const text = span.textContent?.trim() || '';
          if (text) {
            words.push({
              text,
              bbox: {
                x0: parseInt(bboxMatch[1], 10),
                y0: parseInt(bboxMatch[2], 10),
                x1: parseInt(bboxMatch[3], 10),
                y1: parseInt(bboxMatch[4], 10),
              },
              confidence: 0, // HOCR doesn't always include confidence
            });
          }
        }
      }
    });
  } catch (e) {
    console.error('HOCR parsing error:', e);
  }
  
  return words;
}

/**
 * Parse TSV (Tab-Separated Values) format to extract word-level data
 */
function parseTSV(tsv: string): OCRWord[] {
  const words: OCRWord[] = [];
  try {
    const lines = tsv.split('\n');
    
    // TSV format: level page_num block_num par_num line_num word_num left top width height conf text
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split('\t');
      if (parts.length >= 12) {
        const level = parts[0];
        // Level 5 = word level
        if (level === '5') {
          const left = parseInt(parts[6], 10);
          const top = parseInt(parts[7], 10);
          const width = parseInt(parts[8], 10);
          const height = parseInt(parts[9], 10);
          const conf = parseFloat(parts[10]) || 0;
          const text = parts[11]?.trim() || '';
          
          if (text) {
            words.push({
              text,
              bbox: {
                x0: left,
                y0: top,
                x1: left + width,
                y1: top + height,
              },
              confidence: conf,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('TSV parsing error:', e);
  }
  
  return words;
}

// Create a reusable worker for better performance
let tesseractWorker: Worker | null = null;

async function getTesseractWorker(onProgress?: (progress: number) => void): Promise<Worker> {
  if (!tesseractWorker) {
    // Create worker with logger to suppress LSTM errors
    tesseractWorker = await createWorker('eng', 1, {
      logger: (m: any) => {
        // Suppress LSTM errors
        if (m.status === 'error') {
          return;
        }
        // Track progress if callback provided
        if (onProgress && m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress(m.progress * 100);
        }
      },
    });
    
    // Try to configure worker to return word-level data
    // In Tesseract.js v6, word data should be available by default, but let's try setting parameters
    try {
      const workerAny = tesseractWorker as any;
      // Set page segmentation mode to get better word detection
      if (typeof workerAny.setParameters === 'function') {
        await workerAny.setParameters({
          tessedit_pageseg_mode: '6', // Uniform block of text
        });
        console.log('✅ Set Tesseract parameters for word detection');
      }
    } catch (e) {
      console.log('Could not set Tesseract parameters:', e);
    }
  }
  // If progress callback is provided and worker exists, update logger using type assertion
  if (onProgress && tesseractWorker) {
    const workerWithLogger = tesseractWorker as any;
    if (typeof workerWithLogger.setLogger === 'function') {
      workerWithLogger.setLogger((m: any) => {
        if (m.status === 'error') {
          return;
        }
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress(m.progress * 100);
        }
      });
    }
  }
  return tesseractWorker;
}

export interface OCRWord {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence: number;
}

export interface OCRPagePreview {
  pageNumber: number;
  imageData: string;
  width: number;
  height: number;
  words: OCRWord[];
}

export interface OCRResult {
  text: string;
  confidence?: number;
  words?: OCRWord[]; // Word-level data with coordinates
  imageData?: string; // Base64 or blob URL for document preview
  imageWidth?: number;
  imageHeight?: number;
  pages?: OCRPagePreview[];
}

/**
 * Runs OCR on a file (PDF or Image)
 * @param file - File to process (PDF, PNG, or JPEG)
 * @param onProgress - Optional progress callback
 * @returns Extracted text from the document
 */
export async function runOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  const supportedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
  if (!supportedTypes.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Supported types: PNG, JPEG, PDF`
    );
  }

  try {
    if (file.type === 'application/pdf') {
      // Handle PDF files
      return await processPDF(file, onProgress);
    } else {
      // Handle image files
      return await processImage(file, onProgress);
    }
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error(
      `OCR Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Process PDF file by converting pages to images and running OCR
 */
async function processPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  let finalText = '';
  let allWords: OCRWord[] = [];
  let firstPageWords: OCRWord[] = []; // Words from first page only (for preview)
  let firstPageImage: string | undefined;
  let imageWidth = 0;
  let imageHeight = 0;
  const pagePreviews: OCRPagePreview[] = [];
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    // Update progress
    if (onProgress) {
      onProgress((i / totalPages) * 100);
    }

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );
    const pageImageData = canvas.toDataURL('image/png');

    // Use Worker API to get word-level data
    // In Tesseract.js v6, we need to explicitly request structured output (HOCR or TSV)
    const worker = await getTesseractWorker();
    
    // Request HOCR format which contains word-level bounding boxes
    // In Tesseract.js v6, we need to explicitly enable HOCR output
    // Try recognizing with HOCR enabled
    let result: any;
    let hocrData: string | null = null;
    
    try {
      // First try with HOCR enabled
      const workerAny = worker as any;
      if (typeof workerAny.recognize === 'function') {
        // Try with options to enable HOCR
        try {
          result = await workerAny.recognize(blob, {}, { hocr: true });
          console.log(`[PDF Page ${i}] Tried recognize with hocr: true option`);
        } catch (e) {
          console.log(`[PDF Page ${i}] Recognize with hocr option failed, trying default:`, e);
          result = await worker.recognize(blob);
        }
      } else {
        result = await worker.recognize(blob);
      }
      
      // Check if HOCR is now available
      if ((result.data as any).hocr) {
        hocrData = (result.data as any).hocr;
        console.log(`[PDF Page ${i}] ✅ HOCR data available:`, hocrData ? 'Yes' : 'No');
      } else {
        console.log(`[PDF Page ${i}] ⚠️ HOCR still null after explicit request`);
      }
    } catch (e) {
      console.log(`[PDF Page ${i}] Error getting HOCR:`, e);
      result = await worker.recognize(blob);
    }

    finalText += result.data.text + '\n\n';
    
    // Log result structure for debugging - EXPANDED TO SEE ALL DATA
    const dataKeys = Object.keys(result.data || {});
    console.log(`[PDF Page ${i}] Tesseract result structure:`, {
      hasWords: !!(result.data as any).words,
      hasLines: !!(result.data as any).lines,
      hasBlocks: !!(result.data as any).blocks,
      dataKeys: dataKeys,
      wordsType: typeof (result.data as any).words,
      wordsLength: Array.isArray((result.data as any).words) ? (result.data as any).words.length : 'not array',
    });
    
    // CRITICAL: Log ALL data keys and their types - EXPANDED FOR VISIBILITY
    console.log(`[PDF Page ${i}] 🔍 ALL DATA KEYS AND TYPES:`);
    dataKeys.forEach(key => {
      const value = (result.data as any)[key];
      const valueType = typeof value;
      const isArray = Array.isArray(value);
      console.log(`  - ${key}:`, {
        type: valueType,
        isArray: isArray,
        length: isArray ? value.length : 'N/A',
        sample: isArray && value.length > 0 
          ? (typeof value[0] === 'object' ? Object.keys(value[0] || {}).slice(0, 10) : value[0])
          : valueType === 'object' && value !== null
            ? Object.keys(value || {}).slice(0, 10)
            : String(value).substring(0, 100)
      });
    });
    
    // Also log the actual keys as a simple array
    console.log(`[PDF Page ${i}] 📋 DATA KEYS LIST:`, dataKeys);
    
    // Check if words are in a different location
    if ((result.data as any).symbols) {
      console.log(`[PDF Page ${i}] Found symbols:`, Array.isArray((result.data as any).symbols) ? (result.data as any).symbols.length : 'not array');
    }
    if ((result.data as any).paragraphs) {
      console.log(`[PDF Page ${i}] Found paragraphs:`, Array.isArray((result.data as any).paragraphs) ? (result.data as any).paragraphs.length : 'not array');
    }
    if ((result.data as any).textlines) {
      console.log(`[PDF Page ${i}] Found textlines:`, Array.isArray((result.data as any).textlines) ? (result.data as any).textlines.length : 'not array');
    }
    
    // Extract word-level data - Tesseract returns words in result.data.words
    // Check multiple possible locations for word data
    // In Tesseract.js v6, data structure might be different
    const wordsData = (result.data as any).words || [];
    const linesData = (result.data as any).lines || [];
    const symbolsData = (result.data as any).symbols || [];
    const textlinesData = (result.data as any).textlines || [];
    
    let pageWords: OCRWord[] = [];
    
    console.log(`[PDF Page ${i}] 🔍 Checking for word data in:`, {
      words: wordsData.length,
      lines: linesData.length,
      symbols: symbolsData.length,
      textlines: textlinesData.length,
    });
    
    // Try direct words array first
    if (wordsData && Array.isArray(wordsData) && wordsData.length > 0) {
      console.log(`[PDF Page ${i}] ✅ Found words in result.data.words`);
      pageWords = wordsData.map((word: any) => ({
        text: word.text || '',
        bbox: {
          x0: word.bbox?.x0 || word.left || 0,
          y0: word.bbox?.y0 || word.top || 0,
          x1: word.bbox?.x1 || (word.left + word.width) || 0,
          y1: word.bbox?.y1 || (word.top + word.height) || 0,
        },
        confidence: word.confidence || 0,
      })).filter((w: OCRWord) => w.text.trim().length > 0);
    }
    
    // Try symbols if words not found
    if (pageWords.length === 0 && symbolsData && Array.isArray(symbolsData) && symbolsData.length > 0) {
      console.log(`[PDF Page ${i}] ⚠️ No words found, trying symbols...`);
      pageWords = symbolsData.map((symbol: any) => ({
        text: symbol.text || '',
        bbox: {
          x0: symbol.bbox?.x0 || symbol.left || 0,
          y0: symbol.bbox?.y0 || symbol.top || 0,
          x1: symbol.bbox?.x1 || (symbol.left + symbol.width) || 0,
          y1: symbol.bbox?.y1 || (symbol.top + symbol.height) || 0,
        },
        confidence: symbol.confidence || 0,
      })).filter((w: OCRWord) => w.text.trim().length > 0);
      console.log(`[PDF Page ${i}] Extracted ${pageWords.length} words from symbols`);
    }
    
    // If no words, try extracting from lines
    if (pageWords.length === 0 && linesData && Array.isArray(linesData)) {
      console.log(`[PDF Page ${i}] ⚠️ No words/symbols found, trying lines...`);
      linesData.forEach((line: any, lineIdx: number) => {
        if (lineIdx < 3) {
          console.log(`[PDF Page ${i}] Line ${lineIdx}:`, {
            hasWords: !!(line.words),
            keys: Object.keys(line || {}),
          });
        }
        if (line.words && Array.isArray(line.words)) {
          line.words.forEach((word: any) => {
            if (word.text && word.text.trim()) {
              pageWords.push({
                text: word.text.trim(),
                bbox: {
                  x0: word.bbox?.x0 || word.left || 0,
                  y0: word.bbox?.y0 || word.top || 0,
                  x1: word.bbox?.x1 || (word.left + word.width) || 0,
                  y1: word.bbox?.y1 || (word.top + word.height) || 0,
                },
                confidence: word.confidence || 0,
              });
            }
          });
        }
      });
      if (pageWords.length > 0) {
        console.log(`[PDF Page ${i}] ✅ Extracted ${pageWords.length} words from lines`);
      }
    }
    
    // Try textlines if available
    if (pageWords.length === 0 && textlinesData && Array.isArray(textlinesData)) {
      console.log(`[PDF Page ${i}] ⚠️ Trying textlines...`);
      textlinesData.forEach((textline: any) => {
        if (textline.words && Array.isArray(textline.words)) {
          textline.words.forEach((word: any) => {
            if (word.text && word.text.trim()) {
              pageWords.push({
                text: word.text.trim(),
                bbox: {
                  x0: word.bbox?.x0 || word.left || 0,
                  y0: word.bbox?.y0 || word.top || 0,
                  x1: word.bbox?.x1 || (word.left + word.width) || 0,
                  y1: word.bbox?.y1 || (word.top + word.height) || 0,
                },
                confidence: word.confidence || 0,
              });
            }
          });
        }
      });
      if (pageWords.length > 0) {
        console.log(`[PDF Page ${i}] ✅ Extracted ${pageWords.length} words from textlines`);
      }
    }

    // If still no words, try extracting from blocks/paragraphs
    if (pageWords.length === 0 && (result.data as any).blocks) {
      console.log(`[PDF Page ${i}] ⚠️ Trying blocks...`);
      const blocks = (result.data as any).blocks || [];
      console.log(`[PDF Page ${i}] Blocks found:`, blocks.length);
      blocks.forEach((block: any, blockIdx: number) => {
        if (blockIdx < 2) {
          console.log(`[PDF Page ${i}] Block ${blockIdx} keys:`, Object.keys(block || {}));
        }
        if (block.paragraphs && Array.isArray(block.paragraphs)) {
          block.paragraphs.forEach((para: any) => {
            if (para.lines && Array.isArray(para.lines)) {
              para.lines.forEach((line: any) => {
                if (line.words && Array.isArray(line.words)) {
                  line.words.forEach((word: any) => {
                    if (word.text && word.text.trim()) {
                      pageWords.push({
                        text: word.text.trim(),
                        bbox: {
                          x0: word.bbox?.x0 || word.left || 0,
                          y0: word.bbox?.y0 || word.top || 0,
                          x1: word.bbox?.x1 || (word.left + word.width) || 0,
                          y1: word.bbox?.y1 || (word.top + word.height) || 0,
                        },
                        confidence: word.confidence || 0,
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
      if (pageWords.length > 0) {
        console.log(`[PDF Page ${i}] ✅ Extracted ${pageWords.length} words from blocks`);
      }
    }
    
    // FINAL CHECK: If still no words, try parsing HOCR or TSV
    if (pageWords.length === 0) {
      console.log(`[PDF Page ${i}] ⚠️ No words in standard format, trying to parse HOCR/TSV...`);
      
      // Try parsing HOCR if available
      if (hocrData && typeof hocrData === 'string') {
        console.log(`[PDF Page ${i}] Parsing HOCR data...`);
        try {
          const hocrWords = parseHOCR(hocrData);
          if (hocrWords.length > 0) {
            pageWords = hocrWords;
            console.log(`[PDF Page ${i}] ✅ Extracted ${pageWords.length} words from HOCR`);
          }
        } catch (e) {
          console.log(`[PDF Page ${i}] HOCR parsing failed:`, e);
        }
      }
      
      // Try parsing TSV if available
      if (pageWords.length === 0 && (result.data as any).tsv) {
        const tsvData = (result.data as any).tsv;
        if (tsvData && typeof tsvData === 'string') {
          console.log(`[PDF Page ${i}] Parsing TSV data...`);
          try {
            const tsvWords = parseTSV(tsvData);
            if (tsvWords.length > 0) {
              pageWords = tsvWords;
              console.log(`[PDF Page ${i}] ✅ Extracted ${pageWords.length} words from TSV`);
            }
          } catch (e) {
            console.log(`[PDF Page ${i}] TSV parsing failed:`, e);
          }
        }
      }
    }
    
    // FINAL CHECK: If still no words, log the FULL result.data structure
    if (pageWords.length === 0) {
      console.error(`[PDF Page ${i}] ❌ NO WORDS FOUND AFTER ALL ATTEMPTS!`);
      console.error(`[PDF Page ${i}] Full result.data structure:`, JSON.stringify(result.data, null, 2).substring(0, 5000));
      console.error(`[PDF Page ${i}] This means Tesseract.js v6 is not returning word-level data in the expected format.`);
      console.error(`[PDF Page ${i}] Possible solutions:`);
      console.error(`  1. Check if Tesseract.js v6 requires different configuration`);
      console.error(`  2. Try using a different output format (HOCR, TSV)`);
      console.error(`  3. Check Tesseract.js documentation for v6 API changes`);
    }
    
    if (pageWords.length > 0) {
      allWords.push(...pageWords);
    }

    pagePreviews.push({
      pageNumber: i,
      imageData: pageImageData,
      width: canvas.width,
      height: canvas.height,
      words: pageWords,
    });
    
    // Store first page words separately for preview matching/backwards compatibility
    if (i === 1) {
      firstPageWords = pageWords;
      imageWidth = canvas.width;
      imageHeight = canvas.height;
      firstPageImage = pageImageData;
    }
  }

  if (onProgress) {
    onProgress(100);
  }

  return {
    text: finalText.trim(),
    confidence: 0, // Tesseract doesn't provide overall confidence for multi-page
    words: firstPageWords.length > 0 ? firstPageWords : allWords, // Use first page words for preview, fallback to all
    imageData: firstPageImage,
    imageWidth,
    imageHeight,
    pages: pagePreviews,
  };
}

/**
 * Process image file directly with OCR
 */
async function processImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  if (onProgress) {
    onProgress(0);
  }

  // Create image preview
  const imageUrl = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  // Use Worker API to get word-level data
  const worker = await getTesseractWorker(onProgress);
  
  // In Tesseract.js v6, we need to explicitly request HOCR/TSV for word-level data
  let result: any;
  let hocrData: string | null = null;
  
  try {
    // Try with HOCR enabled
    const workerAny = worker as any;
    if (typeof workerAny.recognize === 'function') {
      try {
        result = await workerAny.recognize(file, {}, { hocr: true });
        console.log('Tried recognize with hocr: true option for image');
      } catch (e) {
        console.log('Recognize with hocr option failed, trying default:', e);
        result = await worker.recognize(file);
      }
    } else {
      result = await worker.recognize(file);
    }
    
    // Check if HOCR is available
    if ((result.data as any).hocr) {
      hocrData = (result.data as any).hocr;
      console.log('✅ HOCR data available for image:', hocrData ? 'Yes' : 'No');
    }
  } catch (e) {
    console.log('Error getting HOCR for image:', e);
    result = await worker.recognize(file);
  }
  
  // CRITICAL: Log the actual structure to see what Tesseract returns
  console.log('🔍 === CRITICAL DEBUG: FULL RESULT ===');
  console.log('Result:', result);
  console.log('Result.data:', result.data);
  console.log('Result.data keys:', Object.keys(result.data || {}));
  console.log('Has lines?', !!(result.data as any).lines);
  console.log('Lines type:', typeof (result.data as any).lines);
  console.log('Lines is array?', Array.isArray((result.data as any).lines));
  if (Array.isArray((result.data as any).lines) && (result.data as any).lines.length > 0) {
    console.log('First line:', (result.data as any).lines[0]);
    console.log('First line keys:', Object.keys((result.data as any).lines[0] || {}));
    if ((result.data as any).lines[0].words) {
      console.log('First line has words:', (result.data as any).lines[0].words);
      console.log('First line words type:', typeof (result.data as any).lines[0].words);
      console.log('First line words is array?', Array.isArray((result.data as any).lines[0].words));
      if (Array.isArray((result.data as any).lines[0].words) && (result.data as any).lines[0].words.length > 0) {
        console.log('First word:', (result.data as any).lines[0].words[0]);
        console.log('First word keys:', Object.keys((result.data as any).lines[0].words[0] || {}));
      }
    }
  }
  console.log('🔍 === END CRITICAL DEBUG ===');
  
  // Log the FULL result structure first to understand what we're getting
  console.log('=== FULL RESULT STRUCTURE ===');
  console.log('Result type:', typeof result);
  console.log('Result keys:', Object.keys(result || {}));
  console.log('Result.data type:', typeof result.data);
  console.log('Result.data keys:', Object.keys(result.data || {}));
  
  // Try multiple ways to get word data
  let wordsFromMethod: any[] = [];
  
  // Method 1: Check if result has words directly
  if ((result as any).words && Array.isArray((result as any).words)) {
    wordsFromMethod = (result as any).words;
    console.log('Found words in result.words:', wordsFromMethod.length);
  }
  
  // Method 2: Check result.data.words
  if (wordsFromMethod.length === 0 && (result.data as any).words) {
    if (Array.isArray((result.data as any).words)) {
      wordsFromMethod = (result.data as any).words;
      console.log('Found words in result.data.words:', wordsFromMethod.length);
    } else {
      console.log('result.data.words exists but is not an array:', typeof (result.data as any).words);
    }
  }
  
  // Method 3: Try getWords() method if available
  if (wordsFromMethod.length === 0) {
    try {
      if (result && typeof (result as any).getWords === 'function') {
        wordsFromMethod = await (result as any).getWords();
        console.log('Got words from result.getWords() method:', wordsFromMethod.length);
      }
      if (wordsFromMethod.length === 0 && typeof (worker as any).getWords === 'function') {
        wordsFromMethod = await (worker as any).getWords();
        console.log('Got words from worker.getWords() method:', wordsFromMethod.length);
      }
    } catch (e) {
      console.log('getWords() method not available or failed:', e);
    }
  }

  // Extract word-level data - Tesseract returns words in result.data.words
  // Check multiple possible locations for word data
  // Also check if words are available from getWords() method
  const wordsData = wordsFromMethod.length > 0 
    ? wordsFromMethod 
    : (result.data as any).words || (result.data as any).symbols || [];
  
  // Log full result structure for debugging
  console.log('=== TESSERACT RESULT DEBUG (IMAGE) ===');
  console.log('Result keys:', Object.keys(result || {}));
  console.log('Data keys:', Object.keys(result.data || {}));
  console.log('Has words:', !!(result.data as any).words, 'Type:', typeof (result.data as any).words, 'IsArray:', Array.isArray((result.data as any).words));
  console.log('Has lines:', !!(result.data as any).lines, 'Type:', typeof (result.data as any).lines, 'IsArray:', Array.isArray((result.data as any).lines));
  console.log('Has blocks:', !!(result.data as any).blocks, 'Type:', typeof (result.data as any).blocks);
  console.log('Words from method:', wordsFromMethod.length);
  console.log('WordsData length:', wordsData?.length || 0, 'IsArray:', Array.isArray(wordsData));
  if ((result.data as any).words && !Array.isArray((result.data as any).words)) {
    console.log('Words is not array, structure:', Object.keys((result.data as any).words || {}));
  }
  if ((result.data as any).lines && Array.isArray((result.data as any).lines) && (result.data as any).lines.length > 0) {
    console.log('First line structure:', (result.data as any).lines[0]);
  }
  console.log('Full result.data (first 3000 chars):', JSON.stringify(result.data, null, 2).substring(0, 3000));
  console.log('=== END DEBUG ===');
  
  const words: OCRWord[] = wordsData && Array.isArray(wordsData) && wordsData.length > 0
    ? wordsData.map((word: any) => ({
        text: word.text || '',
        bbox: {
          x0: word.bbox?.x0 || word.left || 0,
          y0: word.bbox?.y0 || word.top || 0,
          x1: word.bbox?.x1 || (word.left + word.width) || 0,
          y1: word.bbox?.y1 || (word.top + word.height) || 0,
        },
        confidence: word.confidence || 0,
      })).filter((w: OCRWord) => w.text.trim().length > 0)
    : [];

  // If no words found, try to extract from lines (THIS IS THE MOST COMMON LOCATION IN TESSERACT.JS V6)
  if (words.length === 0 && (result.data as any).lines) {
    console.log('⚠️ No words in direct array, trying to extract from lines...');
    const lines = (result.data as any).lines || [];
    console.log('Lines found:', lines.length);
    
    lines.forEach((line: any, lineIdx: number) => {
      if (lineIdx < 3) {
        console.log(`Line ${lineIdx} structure:`, {
          hasWords: !!(line.words),
          wordsType: typeof line.words,
          wordsIsArray: Array.isArray(line.words),
          wordsLength: Array.isArray(line.words) ? line.words.length : 'N/A',
          lineKeys: Object.keys(line || {}),
        });
      }
      
      if (line.words && Array.isArray(line.words)) {
        line.words.forEach((word: any) => {
          if (word.text && word.text.trim()) {
            words.push({
              text: word.text.trim(),
              bbox: {
                x0: word.bbox?.x0 || word.left || 0,
                y0: word.bbox?.y0 || word.top || 0,
                x1: word.bbox?.x1 || (word.left + word.width) || 0,
                y1: word.bbox?.y1 || (word.top + word.height) || 0,
              },
              confidence: word.confidence || 0,
            });
          }
        });
      }
    });
    console.log(`✅ Extracted ${words.length} words from lines`);
  }

  // If still no words, try extracting from blocks/paragraphs
  if (words.length === 0 && (result.data as any).blocks) {
    console.log('Trying to extract words from blocks...');
    const blocks = (result.data as any).blocks || [];
    blocks.forEach((block: any) => {
      if (block.paragraphs && Array.isArray(block.paragraphs)) {
        block.paragraphs.forEach((para: any) => {
          if (para.lines && Array.isArray(para.lines)) {
            para.lines.forEach((line: any) => {
              if (line.words && Array.isArray(line.words)) {
                line.words.forEach((word: any) => {
                  if (word.text && word.text.trim()) {
                    words.push({
                      text: word.text.trim(),
                      bbox: {
                        x0: word.bbox?.x0 || word.left || 0,
                        y0: word.bbox?.y0 || word.top || 0,
                        x1: word.bbox?.x1 || (word.left + word.width) || 0,
                        y1: word.bbox?.y1 || (word.top + word.height) || 0,
                      },
                      confidence: word.confidence || 0,
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  if (onProgress) {
    onProgress(100);
  }

  console.log('Extracted words:', words.length, 'from image');

  const imagePagePreview: OCRPagePreview = {
    pageNumber: 1,
    imageData: imageUrl,
    width: img.width,
    height: img.height,
    words,
  };

  // Don't revoke URL - keep it for preview
  return {
    text: result.data.text,
    confidence: result.data.confidence || 0,
    words,
    imageData: imageUrl, // Keep URL for preview (caller should revoke when done)
    imageWidth: img.width,
    imageHeight: img.height,
    pages: [imagePagePreview],
  };
}

