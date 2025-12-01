import React, { useEffect, useRef, useState } from 'react';
import { CurrentDocument } from '@/types/Document';
import { Restriction } from '@/types/Restriction';
import { AlertTriangle, EyeOff, Loader2 } from 'lucide-react';
import axios from '@/api/axios';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker?worker';

// Ensure pdf.js knows about the worker (same setup used by DocumentPreview)
// @ts-ignore
GlobalWorkerOptions.workerPort = new PdfJsWorker();

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MaskedDocumentViewerProps {
  currentDocument: CurrentDocument | null;
  restrictions: Restriction[];
}

const MaskedDocumentViewer: React.FC<MaskedDocumentViewerProps> = ({
  currentDocument,
  restrictions,
}) => {
  const docInfo = currentDocument?.document?.[0];
  const imgRef = useRef<HTMLImageElement>(null);

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    natural: { width: 0, height: 0 },
    display: { width: 0, height: 0 },
  });

  const filePath = docInfo?.filepath;
  const hasDataImage = Boolean(docInfo?.DataImage?.data?.length);
  const isPdf = filePath?.toLowerCase()?.endsWith('.pdf');

  const areaRestrictions = restrictions.filter(
    (restriction) => restriction.restrictedType === 'open'
  );

  const renderPdfToImage = async (pdfUrl: string): Promise<string> => {
    setPdfRendering(true);
    try {
      let pdfData: Uint8Array | undefined;

      try {
        const response = await axios.get<ArrayBuffer>(pdfUrl, {
          responseType: 'arraybuffer',
          withCredentials: false,
        });
        pdfData = new Uint8Array(response.data);
      } catch (fetchError) {
        console.warn(
          'Axios fetch for masked PDF preview failed, trying fallback URL:',
          fetchError
        );
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
      const canvas = window.document.createElement('canvas');
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
              console.error('Failed to render masked PDF preview:', error);
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
        console.error('Failed to prepare masked document preview:', error);
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
    console.error('Failed to load masked document image');
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

  const showLoadingState = (imageLoading && documentUrl) || pdfRendering;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="bg-red-500 rounded-full p-2">
          <EyeOff className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">
            Sensitive areas hidden for your role
          </p>
          <p className="text-xs text-red-600 mt-1">
            {areaRestrictions.length} custom area
            {areaRestrictions.length === 1 ? '' : 's'} masked based on the
            selected masking setup.
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
          className="relative mx-auto max-w-full overflow-auto"
          style={{ maxHeight: '70vh', minHeight: '400px' }}
        >
          <div className="relative flex min-w-full min-h-[400px] items-center justify-center bg-white">
            {documentUrl && !imageError ? (
              <div className="relative">
                <img
                  ref={imgRef}
                  src={documentUrl}
                  alt="Masked document preview"
                  className="block max-w-full h-auto max-h-[60vh] object-contain shadow-lg rounded-lg"
                  crossOrigin="anonymous"
                  draggable={false}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />

                {/* Mask overlays */}
                {areaRestrictions.map((restriction) => {
                  const coords =
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
                      key={restriction.ID}
                      className="absolute bg-gray-900 bg-opacity-90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700"
                      style={{
                        left: `${coords.x}px`,
                        top: `${coords.y}px`,
                        width: `${coords.width}px`,
                        height: `${coords.height}px`,
                      }}
                    >
                      <div className="flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="h-3 w-3 text-yellow-300" />
                        Restricted Area
                      </div>
                      {restriction.Field && (
                        <p className="mt-1 font-semibold truncate">
                          {restriction.Field}
                        </p>
                      )}
                      {restriction.Reason && (
                        <p className="mt-0.5 text-[10px] text-gray-200 line-clamp-2">
                          {restriction.Reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full h-96 flex flex-col items-center justify-center text-gray-500 bg-white rounded-lg border border-gray-200 px-6 text-center">
                <EyeOff className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-semibold mb-2">
                  {imageError ? 'Preview unavailable' : 'Document not available'}
                </p>
                <p className="text-sm text-gray-400">
                  {imageError
                    ? 'We could not generate a masked preview for this document.'
                    : 'No preview could be generated for this document.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaskedDocumentViewer;

