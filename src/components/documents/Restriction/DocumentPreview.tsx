import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Loader2, Image as ImageIcon, Move, Square } from 'lucide-react';
import { CurrentDocument } from '@/types/Document';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker?worker';
import axios from '@/api/axios';

// @ts-ignore
GlobalWorkerOptions.workerPort = new PdfJsWorker();

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DocumentPreviewProps {
  document: CurrentDocument | null;
  onAreaSelect: (area: Rect) => void;
  selectedArea: Rect | null;
  existingRestrictions: Array<{
    id: number;
    field: string;
    xaxis: number;
    yaxis: number;
    width: number;
    height: number;
    restrictedType: 'field' | 'open';
  }>;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document: currentDocument,
  onAreaSelect,
  selectedArea,
  existingRestrictions,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentSelection, setCurrentSelection] = useState<Rect | null>(null);
  const [imageDimensions, setImageDimensions] = useState({
    natural: { width: 0, height: 0 },
    display: { width: 0, height: 0 },
  });
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [pdfRendering, setPdfRendering] = useState(false);

  const docInfo = currentDocument?.document?.[0];
  const filePath = docInfo?.filepath;
  const hasDataImage = Boolean(docInfo?.DataImage?.data?.length);
  const isPdf = filePath?.toLowerCase()?.endsWith('.pdf');

  const renderPdfToImage = async (pdfUrl: string): Promise<string> => {
    setPdfRendering(true);
    try {
      let pdfData: Uint8Array | undefined;

      try {
        // Try fetching via Axios with credentials (handles CORS)
        const response = await axios.get<ArrayBuffer>(pdfUrl, {
          responseType: 'arraybuffer',
          withCredentials: false,
        });
        pdfData = new Uint8Array(response.data);
      } catch (fetchError) {
        console.warn('Axios fetch for PDF preview failed, trying fallback URL:', fetchError);
      }

      const loadingTask = pdfData
        ? getDocument({ data: pdfData })
        : getDocument({
            url: pdfUrl,
            withCredentials: false,
          });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context!, viewport }).promise;
      return canvas.toDataURL('image/png');
    } finally {
      setPdfRendering(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const buildDocumentUrl = async () => {
      setImageLoading(true);
      setImageError(false);

      if (!docInfo) {
        if (isMounted) {
          setDocumentUrl(null);
          setImageLoading(false);
          setImageError(true);
        }
        return;
      }

      try {
        if (hasDataImage && docInfo.DataImage?.data) {
          const bytes = new Uint8Array(docInfo.DataImage.data);
          const blob = new Blob([bytes], {
            type: docInfo.DataImage.type || 'image/png',
          });
          objectUrl = URL.createObjectURL(blob);
          if (isMounted) {
            setDocumentUrl(objectUrl);
          }
          return;
        }

        if (filePath) {
          let normalizedPath = filePath;
          if (
            !normalizedPath.startsWith('http') &&
            !normalizedPath.startsWith('/')
          ) {
            normalizedPath = `/${normalizedPath}`;
          }

          if (isPdf) {
            try {
              const pdfImage = await renderPdfToImage(normalizedPath);
              if (isMounted) {
                setDocumentUrl(pdfImage);
              }
            } catch (error) {
              console.error('Failed to render PDF preview:', error);
              if (isMounted) {
                setDocumentUrl(null);
                setImageError(true);
                setImageLoading(false);
              }
            }
            return;
          }

          if (isMounted) {
            setDocumentUrl(normalizedPath);
          }
          return;
        }

        if (isMounted) {
          setDocumentUrl(null);
          setImageError(true);
          setImageLoading(false);
        }
      } catch (error) {
        console.error('Failed to prepare document preview:', error);
        if (isMounted) {
          setDocumentUrl(null);
          setImageError(true);
          setImageLoading(false);
        }
      }
    };

    buildDocumentUrl();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [docInfo, filePath, hasDataImage, isPdf]);

  const handleImageLoad = () => {
    if (imgRef.current) {
      const img = imgRef.current;
      setImageDimensions({
        natural: {
          width: img.naturalWidth,
          height: img.naturalHeight,
        },
        display: {
          width: img.clientWidth,
          height: img.clientHeight,
        },
      });
      setImageLoading(false);
      setImageError(false);
    }
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error('Failed to load document image');
  };

  const convertDisplayToNatural = (displayCoords: Rect): Rect => {
    if (
      imageDimensions.natural.width === 0 ||
      imageDimensions.display.width === 0
    ) {
      return displayCoords;
    }

    const scaleX =
      imageDimensions.natural.width / imageDimensions.display.width;
    const scaleY =
      imageDimensions.natural.height / imageDimensions.display.height;

    return {
      x: Math.round(displayCoords.x * scaleX),
      y: Math.round(displayCoords.y * scaleY),
      width: Math.round(displayCoords.width * scaleX),
      height: Math.round(displayCoords.height * scaleY),
    };
  };

  const convertNaturalToDisplay = (naturalCoords: Rect): Rect => {
    if (
      imageDimensions.natural.width === 0 ||
      imageDimensions.display.width === 0
    ) {
      return naturalCoords;
    }

    const scaleX =
      imageDimensions.display.width / imageDimensions.natural.width;
    const scaleY =
      imageDimensions.display.height / imageDimensions.natural.height;

    return {
      x: naturalCoords.x * scaleX,
      y: naturalCoords.y * scaleY,
      width: naturalCoords.width * scaleX,
      height: naturalCoords.height * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current || imageError) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      setStartPoint({ x, y });
      setIsDragging(true);
      setCurrentSelection({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !startPoint || !imgRef.current || imageError) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const newSelection = {
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    };

    setCurrentSelection(newSelection);
  };

  const handleMouseUp = () => {
    if (
      currentSelection &&
      currentSelection.width > 10 &&
      currentSelection.height > 10
    ) {
      const naturalCoords = convertDisplayToNatural(currentSelection);
      onAreaSelect(naturalCoords);
    }
    setIsDragging(false);
    setStartPoint(null);
    setCurrentSelection(null);
  };

  const showLoadingState = (imageLoading && documentUrl) || pdfRendering;

  return (
    <div className="p-6">
      {/* Enhanced Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Square className="h-5 w-5 text-orange-500" />
            Document Preview
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Move className="h-4 w-4" />
            Drag to select
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm text-orange-700">
            <strong>Instructions:</strong> Click and drag on the document to
            select the area you want to restrict. Minimum selection size is
            10×10 pixels.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden">
        {showLoadingState && (
          <div className="flex items-center justify-center bg-gray-50 py-16">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">
                {pdfRendering ? 'Preparing preview...' : 'Loading document...'}
              </p>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="relative mx-auto max-w-full overflow-auto"
          style={{ maxHeight: '70vh', minHeight: '400px' }}
        >
          <div
            className="relative inline-block cursor-crosshair min-w-full min-h-[400px] flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {documentUrl && !imageError ? (
              <div className="relative">
                <img
                  ref={imgRef}
                  src={documentUrl}
                  alt="Document preview"
                  className="block max-w-full h-auto max-h-[60vh] object-contain shadow-lg rounded-lg"
                  crossOrigin="anonymous"
                  draggable={false}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  style={{
                    cursor: isDragging ? 'grabbing' : 'crosshair',
                  }}
                />

                {/* Current dragging selection */}
                {currentSelection && isDragging && (
                  <div
                    className="absolute border-2 border-orange-500 bg-orange-200 bg-opacity-30 pointer-events-none z-20"
                    style={{
                      left: `${currentSelection.x}px`,
                      top: `${currentSelection.y}px`,
                      width: `${currentSelection.width}px`,
                      height: `${currentSelection.height}px`,
                    }}
                  >
                    <div className="absolute -top-8 left-0 bg-orange-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {currentSelection.width} × {currentSelection.height}px
                    </div>
                  </div>
                )}

                {/* Selected area (confirmed) */}
                {selectedArea && imageDimensions.natural.width > 0 && (
                  <div
                    className="absolute border-2 border-green-500 bg-green-200 bg-opacity-20 pointer-events-none z-15 shadow-lg"
                    style={{
                      ...convertNaturalToDisplay(selectedArea),
                    }}
                  >
                    <div className="absolute -top-8 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-sm">
                      Selected: {selectedArea.width} × {selectedArea.height}px
                    </div>
                  </div>
                )}

                {/* Existing restrictions */}
                {existingRestrictions.map((restriction) => {
                  const displayCoords =
                    imageDimensions.natural.width > 0
                      ? convertNaturalToDisplay({
                          x: restriction.xaxis,
                          y: restriction.yaxis,
                          width: restriction.width,
                          height: restriction.height,
                        })
                      : {
                          x: restriction.xaxis,
                          y: restriction.yaxis,
                          width: restriction.width,
                          height: restriction.height,
                        };

                  return (
                    <div
                      key={restriction.id}
                      className="absolute border-2 border-red-500 bg-red-200 bg-opacity-20 pointer-events-none z-10 shadow-sm"
                      style={{
                        left: `${displayCoords.x}px`,
                        top: `${displayCoords.y}px`,
                        width: `${displayCoords.width}px`,
                        height: `${displayCoords.height}px`,
                      }}
                    >
                      <div className="absolute -top-8 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded max-w-xs truncate shadow-sm">
                        Existing: {restriction.field}
                      </div>
                    </div>
                  );
                })}

                {/* Instruction overlay */}
                {!isDragging && !selectedArea && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black bg-opacity-70 text-white text-sm px-6 py-3 rounded-lg shadow-lg">
                      <div className="flex items-center gap-2">
                        <Move className="h-4 w-4" />
                        Click and drag to select an area
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-96 flex items-center justify-center text-gray-500 flex-col bg-white rounded-lg border border-gray-200">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-center font-medium mb-2">
                  {imageError
                    ? 'Failed to load document'
                    : 'Document not available'}
                </p>
                <p className="text-sm text-gray-400">
                  Cannot preview document for area selection
                </p>
                {imageError && documentUrl && (
                  <details className="mt-4 text-xs">
                    <summary className="cursor-pointer text-gray-400">
                      Technical details
                    </summary>
                    <code className="block mt-2 p-2 bg-gray-100 rounded text-gray-600">
                      {documentUrl}
                    </code>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Info Footer */}
        {imageDimensions.natural.width > 0 && !imageError && (
          <div className="bg-gray-100 px-4 py-3 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>
                Document: {imageDimensions.natural.width} ×{' '}
                {imageDimensions.natural.height}px
              </span>
              <span>
                Scale:{' '}
                {Math.round(
                  (imageDimensions.display.width /
                    imageDimensions.natural.width) *
                    100
                )}
                %
              </span>
              <span>{existingRestrictions.length} existing restrictions</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;
