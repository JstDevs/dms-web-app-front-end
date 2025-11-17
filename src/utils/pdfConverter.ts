import axios from '@/api/axios';

/**
 * Converts a PDF file to PDF/A format
 * PDF/A is an ISO-standardized version of PDF designed for archiving and long-term preservation
 * 
 * IMPORTANT: True PDF/A conversion requires specialized libraries (iText, PDFBox, Adobe PDF Services)
 * This function attempts to use a backend API first, then falls back to the original PDF
 * 
 * @param pdfBlob - The PDF file as a Blob
 * @param documentId - Optional document ID for backend processing
 * @returns Promise<{ blob: Blob, converted: boolean }> - The PDF/A formatted file with conversion status
 */
export async function convertPdfToPdfA(
  pdfBlob: Blob,
  documentId?: number
): Promise<{ blob: Blob; converted: boolean }> {
  try {
    // First, try to use backend API for PDF/A conversion if available
    // Backend should use a proper PDF/A library like:
    // - iText (Java/.NET)
    // - PDFBox (Java)
    // - Adobe PDF Services API
    // - Ghostscript with pdfa_def.ps
    if (documentId) {
      try {
        const formData = new FormData();
        formData.append('file', pdfBlob, 'document.pdf');
        formData.append('documentId', String(documentId));

        const response = await axios.post(
          '/documents/convert-to-pdfa',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            responseType: 'blob',
            timeout: 60000, // 60 second timeout for conversion
          }
        );

        // Verify the response is a PDF
        if (response.data && response.data instanceof Blob) {
          const responseType = response.data.type || 'application/pdf';
          if (responseType === 'application/pdf' || responseType.includes('pdf')) {
            return { blob: response.data, converted: true };
          }
        }
      } catch (apiError: any) {
        // Check if it's a 404 (endpoint doesn't exist) vs other error
        if (apiError?.response?.status === 404) {
          console.info('PDF/A conversion endpoint not available on backend. Backend implementation required.');
        } else {
          console.warn('Backend PDF/A conversion failed:', apiError?.message || apiError);
        }
        // Fall through to return original PDF
      }
    }

    // Alternative: Try direct file path conversion endpoint
    // Some backends might accept a file path instead of file upload
    if (documentId) {
      try {
        const response = await axios.get(
          `/documents/${documentId}/convert-to-pdfa`,
          {
            responseType: 'blob',
            timeout: 60000,
          }
        );

        if (response.data && response.data instanceof Blob) {
          return { blob: response.data, converted: true };
        }
      } catch (altApiError: any) {
        // Silently fail - this is an alternative endpoint
        if (altApiError?.response?.status !== 404) {
          console.warn('Alternative PDF/A conversion endpoint failed:', altApiError?.message);
        }
      }
    }

    // If backend conversion is not available, we cannot perform true PDF/A conversion client-side
    // PDF/A requires:
    // - Embedded fonts (all fonts must be embedded)
    // - Proper XMP metadata with PDF/A schema
    // - No encryption
    // - No JavaScript
    // - Proper color profiles
    // - Specific PDF structure compliance
    // 
    // Client-side libraries like pdf-lib do not support PDF/A conversion
    // You MUST implement this on the backend using proper PDF/A libraries
    
    console.warn(
      'PDF/A conversion requires backend implementation. ' +
      'Please implement /documents/convert-to-pdfa endpoint using a PDF/A library like iText, PDFBox, or Adobe PDF Services.'
    );
    
    // Return original PDF - cannot convert without backend
    return { blob: pdfBlob, converted: false };
  } catch (error) {
    console.error('PDF/A conversion failed:', error);
    // Return original PDF if conversion fails
    return { blob: pdfBlob, converted: false };
  }
}

/**
 * Validates if a PDF is PDF/A compliant
 * This requires a PDF/A validator library (typically backend-only)
 */
export async function validatePdfA(pdfBlob: Blob): Promise<boolean> {
  try {
    // PDF/A validation requires specialized tools like:
    // - Preflight (Adobe)
    // - PDF/A validator (veraPDF)
    // - iText PDF/A validator
    // 
    // This cannot be done reliably client-side
    // Should be implemented as a backend endpoint: /documents/validate-pdfa
    
    console.warn('PDF/A validation requires backend implementation');
    return false;
  } catch (error) {
    console.error('PDF/A validation failed:', error);
    return false;
  }
}

