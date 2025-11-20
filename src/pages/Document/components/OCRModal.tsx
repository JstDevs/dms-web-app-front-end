import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@chakra-ui/react';
import { Select } from '@/components/ui/Select';
import {
  X,
  Scan,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  ShieldCheck,
  Info,
  FileCheck,
  Sparkles,
  Target,
  Clock,
  FileX,
  Zap,
  Eye,
  Type,
} from 'lucide-react';
import { runOCR, OCRWord, OCRPagePreview } from '../utils/ocrService';
import { FieldAllocation } from '../utils/fieldAllocationService';
import toast from 'react-hot-toast';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fields: FieldAllocation[]; // Text fields only
  onApplyToField: (fieldId: number, text: string) => void;
  preselectedFieldId?: number | null; // Optional: pre-select a field when opening
  usedSelections?: { fieldId: number; text: string }[];
}

export const OCRModal: React.FC<OCRModalProps> = ({
  isOpen,
  onClose,
  file,
  fields,
  onApplyToField,
  preselectedFieldId = null,
  usedSelections = [],
}) => {
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasRunOCR, setHasRunOCR] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [ocrWords, setOcrWords] = useState<OCRWord[]>([]);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, displayWidth: 0, displayHeight: 0 });
  const [selectedRegion, setSelectedRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [pagePreviews, setPagePreviews] = useState<OCRPagePreview[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'preview' | 'text'>('preview'); // Toggle between document preview and text view
  const [fitToScreen, setFitToScreen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileUrlRef = useRef<string | null>(null);
  
  // Memoize usedFieldIds to prevent infinite loops
  const usedFieldIds = useMemo(() => 
    usedSelections.map((entry) => entry.fieldId),
    [usedSelections]
  );

  // Create file URL once when file changes
  useEffect(() => {
    if (file) {
      // Clean up old URL if exists
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
      }
      // Create new URL
      fileUrlRef.current = URL.createObjectURL(file);
    }
    return () => {
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
    };
  }, [file]);

  // Calculate statistics
  const stats = useMemo(() => {
    const textFields = fields.filter((f) => f.Type !== 'date' && f.Type !== 'Date');
    const availableFields = textFields.filter((field) => !usedFieldIds.includes(field.ID));
    const wordCount = ocrText ? ocrText.trim().split(/\s+/).filter(Boolean).length : 0;
    const charCount = ocrText ? ocrText.length : 0;
    const lineCount = ocrText ? ocrText.split('\n').filter(Boolean).length : 0;

    return {
      totalFields: textFields.length,
      availableFields: availableFields.length,
      usedFields: usedSelections.length,
      wordCount,
      charCount,
      lineCount,
    };
  }, [fields, usedFieldIds, usedSelections.length, ocrText]);

  const hasMultiplePages = pagePreviews.length > 1;

  // Store documentImage ref to avoid dependency issues
  const documentImageRef = useRef<string | null>(null);
  useEffect(() => {
    documentImageRef.current = documentImage;
  }, [documentImage]);

  // Suppress LSTM console errors (they're non-fatal warnings)
  useEffect(() => {
    if (!isOpen) return;
    
    const originalError = console.error;
    const errorFilter = (...args: any[]) => {
      const message = args.join(' ');
      // Suppress LSTM-related errors
      if (message.includes('LSTM requested, but not present')) {
        return; // Don't log this error
      }
      originalError.apply(console, args);
    };
    
    console.error = errorFilter;
    
    return () => {
      console.error = originalError;
    };
  }, [isOpen]);

  // Reset state when modal closes or set preselected field when opens
  useEffect(() => {
    if (!isOpen) {
      setOcrText('');
      setSelectedText('');
      setSelectedFieldId(null);
      setHasRunOCR(false);
      setProgress(0);
      setProcessingStage('');
      setOcrWords([]);
      setSelectedRegion(null);
      setViewMode('preview');
      // Clean up image URL if it exists
      if (documentImageRef.current && documentImageRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(documentImageRef.current);
        documentImageRef.current = null;
      }
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
      setDocumentImage(null);
      setPagePreviews([]);
      setCurrentPageIndex(0);
    } else if (preselectedFieldId && !usedFieldIds.includes(preselectedFieldId)) {
      // Pre-select field when modal opens with preselected field
      setSelectedFieldId(preselectedFieldId);
    } else if (preselectedFieldId && usedFieldIds.includes(preselectedFieldId)) {
      toast.error('This field already has OCR text applied');
    }
  }, [isOpen, preselectedFieldId, usedFieldIds]);

  useEffect(() => {
    if (selectedFieldId && usedFieldIds.includes(selectedFieldId)) {
      setSelectedFieldId(null);
    }
  }, [usedFieldIds, selectedFieldId]);

  useEffect(() => {
    setSelectedRegion(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [fitToScreen]);

  // Get selected text from user selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
      }
    };

    if (isOpen && ocrText) {
      document.addEventListener('selectionchange', handleSelection);
      return () => {
        document.removeEventListener('selectionchange', handleSelection);
      };
    }
  }, [isOpen, ocrText]);

  useEffect(() => {
    if (pagePreviews.length === 0) {
      return;
    }
    const safeIndex = Math.min(currentPageIndex, pagePreviews.length - 1);
    if (safeIndex !== currentPageIndex) {
      setCurrentPageIndex(safeIndex);
      return;
    }
    const activePage = pagePreviews[safeIndex];
    if (!activePage) {
      return;
    }
    setDocumentImage(activePage.imageData);
    setOcrWords(activePage.words || []);
    setImageDimensions({
      width: activePage.width,
      height: activePage.height,
      displayWidth: 0,
      displayHeight: 0,
    });
    setSelectedRegion(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [pagePreviews, currentPageIndex]);

  const handleRunOCR = async () => {
    if (!file) {
      toast.error('No file selected');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setOcrText('');
    setHasRunOCR(false);
    setProcessingStage('Initializing OCR engine...');
    setDocumentImage(null);
    setSelectedRegion(null);
    setSelectionStart(null);
    setSelectionEnd(null);

    try {
      let currentProgress = 0;
      
      // Simulate stage updates
      const stageInterval = setInterval(() => {
        if (currentProgress < 30) {
          setProcessingStage('Loading document...');
        } else if (currentProgress < 60) {
          setProcessingStage('Analyzing document structure...');
        } else if (currentProgress < 90) {
          setProcessingStage('Extracting text...');
        } else {
          setProcessingStage('Finalizing results...');
        }
      }, 500);

      const result = await runOCR(file, (prog) => {
        currentProgress = Math.round(prog);
        setProgress(currentProgress);
      });

      clearInterval(stageInterval);
      setOcrText(result.text);

      const hasPagePreviews = Array.isArray(result.pages) && (result.pages?.length || 0) > 0;
      if (hasPagePreviews && result.pages) {
        setPagePreviews(result.pages);
        setCurrentPageIndex(0);
      } else {
        setPagePreviews([]);
        setOcrWords(result.words || []);
        
        // Always set document image - prioritize OCR result, fallback to file
        if (result.imageData) {
          console.log('Using OCR result imageData');
          setDocumentImage(result.imageData);
          // Set image dimensions
          if (result.imageWidth && result.imageHeight) {
            setImageDimensions({
              width: result.imageWidth,
              height: result.imageHeight,
              displayWidth: 0, // Will be set when image loads
              displayHeight: 0,
            });
          }
        } else if (file) {
          // Create preview from file if OCR didn't return image
          console.log('Creating preview from file:', file.type);
          if (file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            setDocumentImage(imageUrl);
          } else if (file.type === 'application/pdf') {
            // For PDF, we'll show it in an iframe
            const pdfUrl = URL.createObjectURL(file);
            setDocumentImage(pdfUrl);
          }
        }
      }
      
      setHasRunOCR(true);
      setProcessingStage('OCR completed successfully');
      toast.success('OCR completed successfully');
      
      // Debug log
      console.log('OCR completed:', {
        hasText: !!result.text,
        hasImage: !!result.imageData,
        hasFile: !!file,
        fileType: file?.type,
        wordCount: result.words?.length || 0,
        documentImageSet: !!documentImage,
        ocrWordsSet: ocrWords.length,
        sampleWords: result.words?.slice(0, 3).map(w => ({ text: w.text, bbox: w.bbox })),
      });
      
      // Warn if no words extracted
      if (!result.words || result.words.length === 0) {
        console.warn('⚠️ NO WORD DATA EXTRACTED! Region selection will not work.');
        console.warn('This means Tesseract.js did not return word-level data with coordinates.');
        console.warn('Text extraction is available, but region selection requires word coordinates.');
      } else {
        console.log('✅ Word data extracted successfully:', result.words.length, 'words');
      }
    } catch (error: any) {
      console.error('OCR error:', error);
      setProcessingStage('OCR processing failed');
      toast.error(error?.message || 'OCR processing failed');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setTimeout(() => setProcessingStage(''), 2000);
    }
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (pagePreviews.length === 0) return;
    setCurrentPageIndex((prev) => {
      const nextIndex = direction === 'prev' ? prev - 1 : prev + 1;
      if (nextIndex < 0 || nextIndex >= pagePreviews.length) {
        return prev;
      }
      return nextIndex;
    });
  };

  const handleApplyToField = () => {
    if (!selectedFieldId) {
      toast.error('Please select a field first');
      return;
    }

    const textToApply = selectedText || ocrText;

    if (!textToApply.trim()) {
      toast.error('Please select text from OCR results or use all text');
      return;
    }

    onApplyToField(selectedFieldId, textToApply.trim());
    toast.success('Text applied to field successfully');
  };

  const handleCopyAll = () => {
    if (ocrText) {
      navigator.clipboard.writeText(ocrText);
      toast.success('Text copied to clipboard');
    }
  };

  const handleUseAllText = () => {
    setSelectedText(ocrText);
    toast.success('All text selected. Click "Apply to Field" to use it.');
  };

  // Handle image load to get display dimensions
  const handleImageLoad = () => {
    if (imgRef.current) {
      setImageDimensions(prev => ({
        ...prev,
        displayWidth: imgRef.current!.clientWidth,
        displayHeight: imgRef.current!.clientHeight,
      }));
    }
  };

  useEffect(() => {
    if (imgRef.current) {
      setImageDimensions(prev => ({
        ...prev,
        displayWidth: imgRef.current!.clientWidth,
        displayHeight: imgRef.current!.clientHeight,
      }));
    }
  }, [fitToScreen, currentPageIndex, documentImage]);

  // Convert display coordinates to natural (original) coordinates
  const convertDisplayToNatural = (displayCoords: { x: number; y: number; width: number; height: number }) => {
    if (imageDimensions.width === 0 || imageDimensions.displayWidth === 0) {
      return displayCoords;
    }
    const scaleX = imageDimensions.width / imageDimensions.displayWidth;
    const scaleY = imageDimensions.height / imageDimensions.displayHeight;
    return {
      x: displayCoords.x * scaleX,
      y: displayCoords.y * scaleY,
      width: displayCoords.width * scaleX,
      height: displayCoords.height * scaleY,
    };
  };

  // Extract text from selected region
  const extractTextFromRegion = (region: { x: number; y: number; width: number; height: number }) => {
    if (ocrWords.length === 0) {
      console.warn('No OCR words available for region extraction');
      return '';
    }

    const naturalRegion = convertDisplayToNatural(region);
    console.log('Converting region:', { display: region, natural: naturalRegion });
    
    const regionText: string[] = [];

    // Sort words by position (top to bottom, left to right)
    const sortedWords = [...ocrWords].sort((a, b) => {
      const aY = (a.bbox.y0 + a.bbox.y1) / 2;
      const bY = (b.bbox.y0 + b.bbox.y1) / 2;
      if (Math.abs(aY - bY) > 10) {
        return aY - bY; // Different lines
      }
      return a.bbox.x0 - b.bbox.x0; // Same line, sort by x
    });

    const regionLeft = naturalRegion.x;
    const regionRight = naturalRegion.x + naturalRegion.width;
    const regionTop = naturalRegion.y;
    const regionBottom = naturalRegion.y + naturalRegion.height;

    console.log('Region bounds:', { regionLeft, regionRight, regionTop, regionBottom });

    sortedWords.forEach((word, idx) => {
      // Check if word overlaps with selected region
      const wordLeft = word.bbox.x0;
      const wordRight = word.bbox.x1;
      const wordTop = word.bbox.y0;
      const wordBottom = word.bbox.y1;

      // Check for overlap (more lenient - any overlap counts)
      const overlaps = !(
        wordRight < regionLeft ||
        wordLeft > regionRight ||
        wordBottom < regionTop ||
        wordTop > regionBottom
      );

      // Also check if word center is within region
      const wordCenterX = (word.bbox.x0 + word.bbox.x1) / 2;
      const wordCenterY = (word.bbox.y0 + word.bbox.y1) / 2;
      const centerInside = (
        wordCenterX >= regionLeft &&
        wordCenterX <= regionRight &&
        wordCenterY >= regionTop &&
        wordCenterY <= regionBottom
      );

      // Even more lenient: check if any corner of word is in region
      const anyCornerInside = (
        (wordLeft >= regionLeft && wordLeft <= regionRight && wordTop >= regionTop && wordTop <= regionBottom) ||
        (wordRight >= regionLeft && wordRight <= regionRight && wordTop >= regionTop && wordTop <= regionBottom) ||
        (wordLeft >= regionLeft && wordLeft <= regionRight && wordBottom >= regionTop && wordBottom <= regionBottom) ||
        (wordRight >= regionLeft && wordRight <= regionRight && wordBottom >= regionTop && wordBottom <= regionBottom)
      );

      if (overlaps || centerInside || anyCornerInside) {
        regionText.push(word.text);
        if (idx < 5) {
          console.log(`Word ${idx} matched:`, word.text, word.bbox);
        }
      }
    });

    const result = regionText.join(' ').trim();
    
    console.log(`Extraction result: ${result.length} chars, ${regionText.length} words matched out of ${sortedWords.length} total words`);
    
    if (!result) {
      console.warn('No text found in region', {
        naturalRegion,
        wordCount: ocrWords.length,
        firstWord: ocrWords[0]?.bbox,
        imageDimensions,
        sampleWords: ocrWords.slice(0, 3).map(w => ({ text: w.text, bbox: w.bbox })),
      });
    }

    return result;
  };

  const imageStyle: React.CSSProperties = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    pointerEvents: 'none',
    touchAction: 'none',
    maxWidth: fitToScreen ? '100%' : 'none',
    maxHeight: fitToScreen ? '60vh' : 'none',
    width: fitToScreen ? '100%' : (imageDimensions.width ? `${imageDimensions.width}px` : 'auto'),
    height: fitToScreen ? 'auto' : (imageDimensions.height ? `${imageDimensions.height}px` : 'auto'),
    // @ts-ignore
    WebkitUserDrag: 'none',
  };

  // Handle mouse events for region selection
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle left mouse button
    if (e.button !== 0) {
      console.log('⚠️ Not left button, ignoring', e.button);
      return;
    }
    
    console.log('🔵🔵🔵 handleMouseDown CALLED!', { 
      target: e.target, 
      currentTarget: e.currentTarget,
      hasImgRef: !!imgRef.current,
      hasDocumentImage: !!documentImage,
      ocrWordsCount: ocrWords.length,
      button: e.button,
      type: e.type
    });
    
    // CRITICAL: Prevent all default behaviors FIRST
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    if (!documentImage) {
      console.warn('Cannot start selection: documentImage missing');
      return;
    }
    
    // Check if we have word data
    if (ocrWords.length === 0) {
      console.warn('⚠️ No OCR words available. Cannot extract text from region.');
      toast.error('No word data available. Please run OCR again or check console for details.');
      return;
    }
    
    // Now that we're using rendered images for both PDF and images, we can use imgRef for both
    if (!imgRef.current) {
      console.warn('imgRef.current is null');
      return;
    }
    
    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const imageRectDown = imgRef.current.getBoundingClientRect();
    
    // Get scroll position of the container (for scrolling support)
    const scrollX = container.scrollLeft || 0;
    const scrollY = container.scrollTop || 0;
    
    // Calculate position relative to the container's viewport
    const clientX = e.clientX - containerRect.left;
    const clientY = e.clientY - containerRect.top;
    
    // Add scroll offset to get position relative to the full image
    const x = clientX + scrollX;
    const y = clientY + scrollY;
    
    // Clamp to image natural dimensions (not display dimensions)
    const maxX = imageDimensions.width || imageRectDown.width;
    const maxY = imageDimensions.height || imageRectDown.height;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));

    console.log('🔵 Mouse position calculated:', { 
      clientX: e.clientX, 
      clientY: e.clientY,
      containerLeft: containerRect.left,
      containerTop: containerRect.top,
      scrollX, 
      scrollY,
      calculatedX: x,
      calculatedY: y,
      clampedX,
      clampedY,
      imageWidth: maxX,
      imageHeight: maxY
    });

    // Calculate scale factor (display size vs natural size)
    const scaleX = (imageDimensions.displayWidth || imageRectDown.width) / (imageDimensions.width || imageRectDown.width);
    const scaleY = (imageDimensions.displayHeight || imageRectDown.height) / (imageDimensions.height || imageRectDown.height);
    
    // Convert natural coordinates to display coordinates for overlay
    // Reference point is the image's top-left corner
    const displayX = clampedX * scaleX;
    const displayY = clampedY * scaleY;
    
    console.log('✅✅✅ Selection started at:', { 
      naturalX: clampedX, 
      naturalY: clampedY, 
      displayX, 
      displayY,
      scaleX,
      scaleY,
      scrollX,
      scrollY,
      imageWidth: maxX, 
      imageHeight: maxY 
    });
    
    // Store natural coordinates for OCR matching
    setSelectionStart({ x: clampedX, y: clampedY });
    setSelectionEnd({ x: clampedX, y: clampedY });
    setIsSelecting(true);
    // Store display coordinates for overlay positioning
    setSelectedRegion({ x: displayX, y: displayY, width: 0, height: 0 });
    console.log('✅✅✅ State updated: isSelecting=true, selectedRegion set');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart) {
      if (isSelecting) {
        console.log('⚠️ handleMouseMove: isSelecting but missing data', { 
          isSelecting, 
          hasSelectionStart: !!selectionStart
        });
      }
      return;
    }

    // Prevent default drag behavior
    e.preventDefault();
    e.stopPropagation();

    // Now that we're using rendered images for both PDF and images, we can use imgRef for both
    if (!imgRef.current || !selectionStart) return;
    
    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const imageRectMove = imgRef.current.getBoundingClientRect();
    
    // Get scroll position of the container (for scrolling support)
    const scrollX = container.scrollLeft || 0;
    const scrollY = container.scrollTop || 0;
    
    // Calculate position relative to the container's viewport
    const clientX = e.clientX - containerRect.left;
    const clientY = e.clientY - containerRect.top;
    
    // Add scroll offset to get position relative to the full image
    const x = clientX + scrollX;
    const y = clientY + scrollY;
    
    // Clamp to image natural dimensions (not display dimensions)
    const maxX = imageDimensions.width || imageRectMove.width;
    const maxY = imageDimensions.height || imageRectMove.height;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));

    // Calculate scale factor (display size vs natural size)
    const scaleX = (imageDimensions.displayWidth || imageRectMove.width) / (imageDimensions.width || imageRectMove.width);
    const scaleY = (imageDimensions.displayHeight || imageRectMove.height) / (imageDimensions.height || imageRectMove.height);
    
    // Convert natural coordinates to display coordinates for overlay
    const startDisplayX = selectionStart.x * scaleX;
    const startDisplayY = selectionStart.y * scaleY;
    const currentDisplayX = clampedX * scaleX;
    const currentDisplayY = clampedY * scaleY;
    
    const newRegion = {
      x: Math.min(startDisplayX, currentDisplayX),
      y: Math.min(startDisplayY, currentDisplayY),
      width: Math.abs(currentDisplayX - startDisplayX),
      height: Math.abs(currentDisplayY - startDisplayY),
    };

    console.log('🟢 handleMouseMove updating region:', {
      display: newRegion,
      natural: { x: Math.min(selectionStart.x, clampedX), y: Math.min(selectionStart.y, clampedY), width: Math.abs(clampedX - selectionStart.x), height: Math.abs(clampedY - selectionStart.y) }
    });
    
    // Store display coordinates for overlay, but we'll use natural coordinates for extraction
    setSelectedRegion(newRegion);
    setSelectionEnd({ x: clampedX, y: clampedY });
  };
  

  const handleMouseUp = () => {
    if (!isSelecting) return;
    
    // Reset selecting state first to allow scrolling again
    setIsSelecting(false);
    
    if (selectedRegion && selectedRegion.width > 10 && selectedRegion.height > 10 && selectionStart && selectionEnd) {
      console.log('=== REGION SELECTION COMPLETE ===');
      console.log('Region selected:', selectedRegion);
      console.log('OCR words available:', ocrWords.length);
      console.log('Image dimensions:', imageDimensions);
      
      if (ocrWords.length === 0) {
        console.error('❌ No OCR words available for extraction!');
        toast.error('No word data available. Please run OCR again.');
        setIsSelecting(false);
        setSelectionStart(null);
        return;
      }
      
      const naturalRegion = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        width: Math.abs(selectionEnd.x - selectionStart.x),
        height: Math.abs(selectionEnd.y - selectionStart.y),
      };
      
      console.log('Natural region for extraction:', naturalRegion);
      
      // Try to extract using OCR words first
      let extractedText = '';
      if (ocrWords.length > 0) {
        extractedText = extractTextFromRegion(selectedRegion);
        console.log('Extracted text from region:', extractedText);
        console.log('Extraction length:', extractedText.length);
      }
      
      // Fallback: If no OCR words or extraction failed, try browser text selection
      if (!extractedText && ocrText) {
        // Use the full OCR text as fallback - user can manually select from text view
        console.log('No words matched, using fallback');
        toast('No text matched in region. Please use text view to select text manually, or try selecting a different area.', {
          icon: 'ℹ️',
          duration: 4000,
        });
      }
      
      if (extractedText) {
        setSelectedText(extractedText);
        toast.success(`Extracted ${extractedText.split(/\s+/).filter(Boolean).length} words from selected region`);
      } else {
        // Provide more helpful error message
        if (ocrWords.length === 0) {
          toast.error('No OCR word data available. Text extraction from regions requires word-level OCR data. Please use the text view to select text manually.');
          console.warn('OCR words not available - word-level extraction not possible');
        } else {
          toast.error('No text found in selected region. Try selecting a different area or use text view.');
          console.log('Debug info:', {
            selectedRegion,
            naturalRegion: convertDisplayToNatural(selectedRegion),
            ocrWordsCount: ocrWords.length,
            imageDimensions,
            sampleWord: ocrWords[0],
            firstFewWords: ocrWords.slice(0, 5).map(w => ({ text: w.text, bbox: w.bbox })),
          });
        }
      }
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedRegion(null);
    setSelectedText('');
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  if (!isOpen) return null;

  // Filter to text fields only (exclude date fields) and remove already used fields
  const textFields = fields.filter((f) => f.Type !== 'date' && f.Type !== 'Date');
  const availableFields = textFields.filter((field) => !usedFieldIds.includes(field.ID));

  const fieldOptions = availableFields.map((field) => ({
    value: field.ID.toString(),
    label: field.Field || field.Description || `Field ${field.ID}`,
  }));

  const selectedField = fields.find((f) => f.ID === selectedFieldId);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-7xl h-[90vh] max-h-[95vh] flex flex-col overflow-hidden shadow-2xl rounded-2xl border border-gray-200/50 bg-white animate-[fadeIn_0.3s_ease-out]">
        {/* Enhanced Header */}
        <CardHeader className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white flex flex-row items-center justify-between py-6 px-6 sm:px-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
              <Scan className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-bold mb-1">
                OCR Text Extraction
              </CardTitle>
              <p className="text-sm sm:text-base text-blue-100/90 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Intelligent document text recognition and field mapping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
            title="Close"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 overflow-y-auto flex-1 bg-gradient-to-br from-gray-50 to-blue-50/30">
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-medium text-gray-600">Available Fields</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.availableFields}</p>
                <p className="text-xs text-gray-500 mt-1">of {stats.totalFields} total</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-600">Used Fields</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.usedFields}</p>
                <p className="text-xs text-gray-500 mt-1">already applied</p>
              </div>
              {ocrText && (
                <>
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-600">Words</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.wordCount}</p>
                    <p className="text-xs text-gray-500 mt-1">extracted</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-gray-600">Characters</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.charCount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">in {stats.lineCount} lines</p>
                  </div>
                </>
              )}
            </div>

            {/* File Information Card */}
            {file && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-gray-900 truncate">{file.name}</h3>
                      {hasRunOCR && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Processed
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <FileX className="w-4 h-4" />
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Info className="w-4 h-4" />
                        <span className="capitalize">{file.type.split('/')[1] || file.type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Uploaded {new Date(file.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Field Selection Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Target Field Selection
                  <span className="text-red-500">*</span>
                </label>
                {selectedField && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                    {selectedField.Field || selectedField.Description}
                  </span>
                )}
              </div>
              <Select
                placeholder="Select a field to populate with OCR text..."
                value={selectedFieldId?.toString() || ''}
                onChange={(e) => setSelectedFieldId(Number(e.target.value))}
                options={fieldOptions}
                disabled={isProcessing || fieldOptions.length === 0}
              />
              <div className="mt-4 space-y-2">
                {fieldOptions.length === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">No Available Fields</p>
                      <p className="text-xs text-amber-700 mt-1">
                        No text fields are available for this document type, or all fields have already been populated.
                      </p>
                    </div>
                  </div>
                )}
                {usedSelections.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Protected Fields</p>
                      <p className="text-xs text-blue-700 mt-1">
                        {usedSelections.length} field{usedSelections.length !== 1 ? 's' : ''} already have OCR text applied and cannot be modified.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OCR Processing Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    OCR Processing
                  </h3>
                  <p className="text-sm text-gray-600">
                    Extract text from your document using advanced OCR technology
                  </p>
                </div>
                <Button
                  onClick={handleRunOCR}
                  disabled={!file || isProcessing}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                    isProcessing
                      ? 'opacity-60 cursor-not-allowed bg-gray-400 text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Scan className="w-5 h-5" />
                      <span>Run OCR Extraction</span>
                    </div>
                  )}
                </Button>
              </div>

              {/* Enhanced Progress Bar */}
              {isProcessing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{processingStage}</span>
                    <span className="font-bold text-indigo-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300 shadow-lg relative overflow-hidden"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document Preview with Selection */}
            {hasRunOCR && file && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Document Preview - Select Region
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">
                    {file.type.startsWith('image/')
                      ? 'Click and drag on the document to select text region'
                      : 'PDF preview - text selection available in text view'}
                  </p>
                  {ocrWords.length === 0 && hasRunOCR && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg">
                      ⚠️ No word data - region selection disabled
                    </span>
                  )}
                  {ocrWords.length > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
                      ✅ {ocrWords.length} words available
                    </span>
                  )}
                </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode(viewMode === 'preview' ? 'text' : 'preview')}
                      className="px-3 py-2 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                    >
                      {viewMode === 'preview' ? (
                        <>
                          <Type className="w-4 h-4" />
                          Show Text View
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Show Preview
                        </>
                      )}
                    </button>
                    {file?.type === 'application/pdf' && ocrWords.length > 0 && (
                      <button
                        onClick={() => {
                          if (!isSelecting) {
                            setIsSelecting(true);
                            toast.success('Selection mode enabled. Click and drag to select text region.');
                          } else {
                            setIsSelecting(false);
                            setSelectedRegion(null);
                            setSelectionStart(null);
                            toast('Selection mode disabled. You can now scroll the PDF.', {
                              icon: 'ℹ️',
                            });
                          }
                        }}
                        className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 font-medium flex items-center gap-2 ${
                          isSelecting
                            ? 'bg-red-100 hover:bg-red-200 text-red-700'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                      >
                        {isSelecting ? (
                          <>
                            <Target className="w-4 h-4" />
                            Disable Selection
                          </>
                        ) : (
                          <>
                            <Target className="w-4 h-4" />
                            Enable Selection
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setFitToScreen((prev) => !prev)}
                      className="px-3 py-2 text-sm bg-white hover:bg-gray-100 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                    >
                      {fitToScreen ? 'Actual Size' : 'Fit to View'}
                    </button>
                    {hasMultiplePages && (
                      <div className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-gray-200">
                        <button
                          onClick={() => handlePageChange('prev')}
                          disabled={currentPageIndex === 0}
                          className="px-2 py-1 text-xs font-medium rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Prev
                        </button>
                        <span className="text-xs font-semibold text-gray-700">
                          Page {currentPageIndex + 1} / {pagePreviews.length}
                        </span>
                        <button
                          onClick={() => handlePageChange('next')}
                          disabled={currentPageIndex === pagePreviews.length - 1}
                          className="px-2 py-1 text-xs font-medium rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                    {selectedRegion && (
                      <button
                        onClick={handleClearSelection}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>

                {viewMode === 'preview' && (
                  <div className="relative border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-100">
                    {/* Use rendered image for both PDF and images - this makes coordinate tracking accurate */}
                    {documentImage ? (
                      <div
                        className="cursor-crosshair select-none overflow-auto max-h-[100vh] p-4"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          touchAction: isSelecting ? 'none' : 'pan-y',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onDragStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          return false;
                        }}
                        onDrag={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          return false;
                        }}
                        onDragEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          return false;
                        }}
                        onWheel={(e) => {
                          if (isSelecting) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <div className="relative inline-block">
                          <img
                            ref={imgRef}
                            src={documentImage}
                            alt="Document preview"
                            className="block object-contain"
                            draggable={false}
                            onLoad={handleImageLoad}
                            onDragStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            onDrag={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            onDragEnd={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              return false;
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                            style={imageStyle}
                          />

                          {/* Selected Region Overlay */}
                          {selectedRegion && selectedRegion.width > 0 && selectedRegion.height > 0 && (
                            <div
                              className="absolute border-2 border-indigo-500 bg-indigo-200 bg-opacity-20 pointer-events-none z-20"
                              style={{
                                left: `${selectedRegion.x}px`,
                                top: `${selectedRegion.y}px`,
                                width: `${selectedRegion.width}px`,
                                height: `${selectedRegion.height}px`,
                              }}
                            >
                              <div className="absolute -top-8 left-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                                {Math.round(selectedRegion.width)} × {Math.round(selectedRegion.height)}px
                              </div>
                            </div>
                          )}

                          {/* Helper text when selection mode is enabled */}
                          {isSelecting && ocrWords.length > 0 && (
                            <div className="absolute top-2 left-2 bg-indigo-600/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20 pointer-events-none">
                              Click and drag to select text region
                            </div>
                          )}

                          {/* Debug info */}
                          {import.meta.env.DEV && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-2 rounded z-30 font-mono">
                              <div>isSelecting: {String(isSelecting)}</div>
                              <div>selectedRegion: {selectedRegion ? `${Math.round(selectedRegion.width)}×${Math.round(selectedRegion.height)}` : 'null'}</div>
                              <div>words: {ocrWords.length}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : file ? (
                      /* Fallback: Show original file if no rendered image available */
                      file.type === 'application/pdf' ? (
                        <div className="relative w-full h-[75vh]">
                          <iframe
                            src={fileUrlRef.current || ''}
                            className="w-full h-full border-0"
                            title="PDF Preview"
                          />
                        </div>
                      ) : (
                        <div className="relative w-full h-[75vh] flex items-center justify-center">
                          <p className="text-gray-500">Loading preview...</p>
                        </div>
                      )
                    ) : null}
                  </div>
                )}

                {/* Selected Text from Region */}
                {selectedText && viewMode === 'preview' && (
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl shadow-sm">
                    <p className="text-xs font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Extracted Text from Selected Region:
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed bg-white/50 p-3 rounded-lg border border-indigo-100">
                      {selectedText}
                    </p>
                    <p className="text-xs text-indigo-700 mt-2">
                      {selectedText.split(/\s+/).filter(Boolean).length} words extracted
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* OCR Results Section */}
            {ocrText && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Extracted Text Results
                      {hasRunOCR && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      )}
                    </label>
                    <p className="text-sm text-gray-600">
                      {viewMode === 'text' ? 'Select text to apply, or use all extracted content' : 'Full extracted text from document'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleCopyAll}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium hover:shadow-md"
                      title="Copy all text to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                      Copy All
                    </button>
                    <button
                      onClick={handleUseAllText}
                      className="px-4 py-2 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-all duration-200 font-medium hover:shadow-md"
                    >
                      Use All Text
                    </button>
                  </div>
                </div>

                {viewMode === 'text' && (
                  <>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={ocrText}
                        className="w-full h-72 sm:h-80 p-5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-sm bg-gray-50 shadow-inner leading-relaxed"
                        placeholder="Extracted text will appear here..."
                        onSelect={(e) => {
                          const selection = e.currentTarget.value.substring(
                            e.currentTarget.selectionStart,
                            e.currentTarget.selectionEnd
                          );
                          if (selection.trim()) {
                            setSelectedText(selection.trim());
                          }
                        }}
                      />
                      <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 text-xs text-gray-600 font-medium shadow-sm">
                        {stats.wordCount} words • {stats.charCount} chars
                      </div>
                    </div>

                    {/* Selected Text Preview */}
                    {selectedText && (
                      <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl shadow-sm">
                        <p className="text-xs font-bold text-indigo-900 mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Selected Text Preview:
                        </p>
                        <p className="text-sm text-gray-800 leading-relaxed bg-white/50 p-3 rounded-lg border border-indigo-100">
                          {selectedText}
                        </p>
                        <p className="text-xs text-indigo-700 mt-2">
                          {selectedText.split(/\s+/).filter(Boolean).length} words selected
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Helpful Instructions - always visible */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-900 flex items-start gap-3 leading-relaxed">
                    <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold">How to use:</strong> Highlight any portion of the extracted text above (Text View) or click-and-drag on the document (Preview View) to capture the content you need. Once you've selected your target field and text, click "Apply to Field" to populate it. Each field can only receive OCR text once to prevent duplicates.
                    </span>
                  </p>
                </div>

                {/* Already Applied Fields - always visible while modal is open */}
                {usedSelections.length > 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-gray-600" />
                      Previously Applied Fields ({usedSelections.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {usedSelections.map((entry) => {
                        const field = fields.find((f) => f.ID === entry.fieldId);
                        return (
                          <div
                            key={entry.fieldId}
                            className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-semibold text-gray-900 text-sm">
                                {field?.Field || `Field ${entry.fieldId}`}
                              </span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                Applied
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                              {entry.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {ocrText && selectedFieldId && (
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t-2 border-gray-200">
                <Button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-semibold transition-all duration-200 hover:shadow-md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyToField}
                  disabled={!selectedFieldId || (!selectedText && !ocrText)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                    !selectedFieldId || (!selectedText && !ocrText)
                      ? 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="flex items-center gap-2"> 
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Apply to Field</span>
                  </div>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

