import Tesseract from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker?worker';

// @ts-ignore
GlobalWorkerOptions.workerPort = new PdfJsWorker();

export interface OCRResult {
  text: string;
  confidence?: number;
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

    const result = await Tesseract.recognize(blob, 'eng+osd', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // Optional: log progress
        }
      },
    });

    finalText += result.data.text + '\n\n';
  }

  if (onProgress) {
    onProgress(100);
  }

  return {
    text: finalText.trim(),
    confidence: 0, // Tesseract doesn't provide overall confidence for multi-page
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

  const result = await Tesseract.recognize(file, 'eng+osd', {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress) {
        if (onProgress) {
          onProgress(m.progress * 100);
        }
      }
    },
  });

  if (onProgress) {
    onProgress(100);
  }

  return {
    text: result.data.text,
    confidence: result.data.confidence || 0,
  };
}

