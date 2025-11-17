# PDF/A Conversion Implementation Guide

## Overview

This document describes the PDF/A conversion feature that has been implemented in the frontend. PDF/A is an ISO-standardized version of PDF designed for archiving and long-term preservation of electronic documents.

## Frontend Implementation

The frontend has been updated to automatically convert PDF files to PDF/A format when downloading. The implementation is located in:

- **`src/utils/pdfConverter.ts`** - PDF/A conversion utility
- **`src/components/documents/DocumentCurrentView.tsx`** - Updated download handler

### How It Works

1. When a user downloads a PDF file, the system attempts to convert it to PDF/A format
2. The conversion is attempted via backend API endpoints
3. If conversion succeeds, the file is downloaded with `_PDFA.pdf` suffix
4. If conversion fails or backend is not available, the original PDF is downloaded

## Backend API Requirements

To enable PDF/A conversion, you need to implement one of the following backend endpoints:

### Option 1: POST Endpoint (Recommended)

**Endpoint:** `POST /documents/convert-to-pdfa`

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: PDF file (Blob/File)
  - `documentId`: Document ID (number, optional)

**Response:**
- Content-Type: `application/pdf`
- Body: PDF/A compliant PDF file (Blob)

**Example Implementation (Node.js/Express):**
```javascript
app.post('/documents/convert-to-pdfa', upload.single('file'), async (req, res) => {
  try {
    const pdfFile = req.file;
    const documentId = req.body.documentId;
    
    // Convert PDF to PDF/A using your chosen library
    const pdfABuffer = await convertToPdfA(pdfFile.buffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfABuffer);
  } catch (error) {
    res.status(500).json({ error: 'PDF/A conversion failed' });
  }
});
```

### Option 2: GET Endpoint (Alternative)

**Endpoint:** `GET /documents/:documentId/convert-to-pdfa`

**Request:**
- Path parameter: `documentId` (number)

**Response:**
- Content-Type: `application/pdf`
- Body: PDF/A compliant PDF file (Blob)

**Example Implementation:**
```javascript
app.get('/documents/:documentId/convert-to-pdfa', async (req, res) => {
  try {
    const documentId = req.params.documentId;
    
    // Fetch document file from storage
    const pdfBuffer = await getDocumentFile(documentId);
    
    // Convert to PDF/A
    const pdfABuffer = await convertToPdfA(pdfBuffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfABuffer);
  } catch (error) {
    res.status(500).json({ error: 'PDF/A conversion failed' });
  }
});
```

## PDF/A Conversion Libraries

You'll need to use a proper PDF/A conversion library on the backend. Here are recommended options:

### Java Backend

1. **iText 7** (Commercial/Open Source)
   ```xml
   <dependency>
     <groupId>com.itextpdf</groupId>
     <artifactId>itext7-core</artifactId>
     <version>8.0.0</version>
   </dependency>
   ```
   ```java
   PdfDocument pdfDoc = new PdfDocument(new PdfReader(inputStream), new PdfWriter(outputStream));
   PdfADocument pdfADoc = new PdfADocument(pdfWriter, PdfAConformanceLevel.PDF_A_1B, null);
   // Copy pages and metadata...
   ```

2. **Apache PDFBox** (Open Source)
   ```xml
   <dependency>
     <groupId>org.apache.pdfbox</groupId>
     <artifactId>pdfbox</artifactId>
     <version>3.0.0</version>
   </dependency>
   ```
   ```java
   PDDocument doc = PDDocument.load(inputStream);
   // Convert to PDF/A...
   ```

### .NET Backend

1. **iText 7 for .NET**
   ```csharp
   using iText.Kernel.Pdf;
   using iText.Pdfa;
   
   PdfADocument pdfADoc = new PdfADocument(
       new PdfWriter(outputStream),
       PdfAConformanceLevel.PDF_A_1B,
       null
   );
   ```

### Node.js Backend

1. **pdf-lib** (Limited PDF/A support - may need additional tools)
2. **Ghostscript** (via command line)
   ```javascript
   const { exec } = require('child_process');
   
   exec(`gs -dPDFA -dBATCH -dNOPAUSE -sColorConversionStrategy=RGB -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile=output.pdf input.pdf`, (error, stdout, stderr) => {
     // Handle result
   });
   ```

3. **Adobe PDF Services API** (Cloud service)
   ```javascript
   const pdfServicesSdk = require('@adobe/pdfservices-node-sdk');
   // Use Adobe's PDF/A conversion service
   ```

### Python Backend

1. **PyPDF2** (Limited - may need additional tools)
2. **pdf2pdfa** (Wrapper around Ghostscript)
   ```python
   from pdf2pdfa import convert_to_pdfa
   convert_to_pdfa('input.pdf', 'output.pdf')
   ```

3. **Adobe PDF Services API** (Cloud service)

## PDF/A Requirements

PDF/A compliant files must meet these requirements:

1. **Embedded Fonts**: All fonts must be embedded in the PDF
2. **Metadata**: Proper XMP metadata with PDF/A schema
3. **No Encryption**: PDFs cannot be password-protected
4. **No JavaScript**: No embedded JavaScript code
5. **Color Profiles**: Proper color profiles for images
6. **Structure**: Specific PDF structure compliance

## Testing

To test the implementation:

1. **Backend Not Available**: The frontend will download the original PDF with an info message
2. **Backend Available**: The frontend will download a PDF/A file with `_PDFA.pdf` suffix
3. **Conversion Fails**: The frontend will download the original PDF with an error message

## Validation

To validate PDF/A compliance, you can use:

1. **veraPDF** (Open source validator)
2. **Adobe Preflight** (Commercial)
3. **iText PDF/A Validator**

## Notes

- PDF/A conversion is computationally intensive and may take time for large files
- The frontend has a 60-second timeout for conversion requests
- If conversion fails, users will still receive the original PDF
- The filename is automatically updated to include `_PDFA` suffix when conversion succeeds

## Future Enhancements

- Add progress indicator for large file conversions
- Add option to download original PDF vs PDF/A
- Add PDF/A validation endpoint
- Support for different PDF/A conformance levels (1A, 1B, 2A, 2B, 2U, 3A, 3B, 3U)

