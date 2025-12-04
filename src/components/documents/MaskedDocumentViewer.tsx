import React, { useEffect, useRef, useState } from 'react';
import { CurrentDocument } from '@/types/Document';
import { Restriction } from '@/types/Restriction';
import { EyeOff, Loader2, Download } from 'lucide-react';
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
  const [downloadingMasked, setDownloadingMasked] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    natural: { width: 0, height: 0 },
    display: { width: 0, height: 0 },
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const pdfDocRef = useRef<any>(null);

  const filePath = docInfo?.filepath;
  const hasDataImage = Boolean(docInfo?.DataImage?.data?.length);
  const isPdf = filePath?.toLowerCase()?.endsWith('.pdf');

  const areaRestrictions = restrictions.filter(
    (restriction) => restriction.restrictedType === 'open'
  );
  const restrictionsForCurrentPage = areaRestrictions.filter(
    (restriction) => (restriction.pageNumber ?? 1) === currentPage
  );
  const canGoPrev = currentPage > 1 && !pdfRendering;
  const canGoNext = currentPage < pageCount && !pdfRendering;

  const handlePageNavigation = async (direction: 'prev' | 'next') => {
    if (!pdfDocRef.current) return;
    const delta = direction === 'prev' ? -1 : 1;
    const target = currentPage + delta;
    if (target < 1 || target > pageCount) return;
    setImageLoading(true);
    await renderPdfPageImage(target);
  };

  const renderPdfPageImage = async (pageNumber: number, pdfInstance?: any) => {
    const pdf = pdfInstance || pdfDocRef.current;
    if (!pdf) return;
    setPdfRendering(true);
    try {
      const clampedPage = Math.max(1, Math.min(pageNumber, pdf.numPages || 1));
      const page = await pdf.getPage(clampedPage);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = window.document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context!, viewport }).promise;
      setDocumentUrl(canvas.toDataURL('image/png'));
      setCurrentPage(clampedPage);
      setImageLoading(false);
      setImageError(false);
    } finally {
      setPdfRendering(false);
    }
  };

  const loadPdfDocument = async (pdfUrl: string) => {
    setImageLoading(true);
    setImageError(false);
    setCurrentPage(1);
    setPageCount(1);
    if (pdfDocRef.current?.destroy) {
      try {
        await pdfDocRef.current.destroy();
      } catch {}
    }
    pdfDocRef.current = null;

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
      pdfDocRef.current = pdf;
      setPageCount(pdf.numPages || 1);
      await renderPdfPageImage(1, pdf);
    } catch (error) {
      throw error;
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
              await loadPdfDocument(normalizedPath);
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
            setPageCount(1);
            setCurrentPage(1);
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
      if (pdfDocRef.current?.destroy) {
        try {
          pdfDocRef.current.destroy();
        } catch {}
      }
      pdfDocRef.current = null;
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

  const downloadMaskedImage = async () => {
    if (!documentUrl || restrictionsForCurrentPage.length === 0) return;
    setDownloadingMasked(true);
    try {
      const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = documentUrl;
      });

      const canvas = window.document.createElement('canvas');
      const width = loadedImage.naturalWidth || loadedImage.width;
      const height = loadedImage.naturalHeight || loadedImage.height;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to access canvas context');
      }
      ctx.drawImage(loadedImage, 0, 0, width, height);

      ctx.fillStyle = '#000';
      restrictionsForCurrentPage.forEach((restriction) => {
        ctx.fillRect(
          restriction.xaxis,
          restriction.yaxis,
          restriction.width,
          restriction.height
        );
      });

      const maskedDataUrl = canvas.toDataURL('image/png', 1.0);
      const downloadLink = window.document.createElement('a');
      const baseName = docInfo?.FileName
        ? docInfo.FileName.replace(/\.[^/.]+$/, '')
        : 'masked-document';
      downloadLink.href = maskedDataUrl;
      const pageSuffix =
        pageCount > 1 ? `_page-${currentPage.toString().padStart(2, '0')}` : '';
      downloadLink.download = `${baseName}${pageSuffix}_masked.png`;
      window.document.body.appendChild(downloadLink);
      downloadLink.click();
      window.document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Failed to download masked copy:', error);
    } finally {
      setDownloadingMasked(false);
    }
  };

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
            {areaRestrictions.length === 0
              ? 'No custom masks configured for this document.'
              : `${areaRestrictions.length} custom mask${
                  areaRestrictions.length === 1 ? '' : 's'
                } configured. Currently viewing page ${currentPage}.`}
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
        {isPdf && pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <p className="text-sm font-medium text-gray-700">
              Page {currentPage} of {pageCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageNavigation('prev')}
                disabled={!canGoPrev}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  canGoPrev
                    ? 'bg-white text-gray-800 hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageNavigation('next')}
                disabled={!canGoNext}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  canGoNext
                    ? 'bg-white text-gray-800 hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
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
                {restrictionsForCurrentPage.map((restriction) => {
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
                      className="absolute bg-black pointer-events-none"
                      style={{
                        opacity: 1.0,
                        left: `${coords.x}px`,
                        top: `${coords.y}px`,
                        width: `${coords.width}px`,
                        height: `${coords.height}px`,
                      }}
                    />
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
      <div className="flex justify-end">
        <button
          onClick={downloadMaskedImage}
          disabled={
            downloadingMasked ||
            !documentUrl ||
            restrictionsForCurrentPage.length === 0 ||
            pdfRendering ||
            imageLoading
          }
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            downloadingMasked ||
            !documentUrl ||
            restrictionsForCurrentPage.length === 0 ||
            pdfRendering ||
            imageLoading
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-900'
          }`}
        >
          {downloadingMasked ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloadingMasked ? 'Preparing masked copy...' : 'Download Masked Copy'}
        </button>
      </div>
    </div>
  );
};

export default MaskedDocumentViewer;

