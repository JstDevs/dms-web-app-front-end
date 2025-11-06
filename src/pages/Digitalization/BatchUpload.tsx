import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { UploadCloud, Trash2, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import toast from 'react-hot-toast';
import { performBatchUpload, performDocumentUpload } from './utils/batchServices';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { logOCRActivity } from '@/utils/activityLogger';
import { useAuth } from '@/contexts/AuthContext';

type UploadedFile = {
  id: number;
  name: string;
  type: string;
  size: string;
  status: 'Pending' | 'Success';
  department: string;
  file: File;
  validationErrors?: string[];
  parsedRows?: number;
};

export const BatchUploadPanel = () => {
  // State for selections
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubDepartment, setSelectedSubDepartment] =
    useState<string>('');
  const [subDepartmentOptions, setSubDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // State for uploaded files
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [lastBatchResponse, setLastBatchResponse] = useState<any>(null);
  const [lastBatchCount, setLastBatchCount] = useState<{ total: number; success: number } | null>(
    null
  );
  const {
    departmentOptions,
    getSubDepartmentOptions,
    loading: loadingDepartments,
  } = useNestedDepartmentOptions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchUploadPermissions = useModulePermissions(8); // 1 = MODULE_ID
  const { user } = useAuth();
  // Update document types when department selection changes
  useEffect(() => {
    if (selectedDepartment && departmentOptions.length > 0) {
      const selectedDeptId = departmentOptions.find(
        (dept) => dept.label === selectedDepartment
      )?.value;

      if (selectedDeptId) {
        const subs = getSubDepartmentOptions(Number(selectedDeptId));
        setSubDepartmentOptions(subs);
        // Only reset if the current subDept doesn't exist in new options
        if (!subs.some((sub) => sub.label === selectedSubDepartment)) {
          setSelectedSubDepartment('');
        }
      }
    } else {
      setSubDepartmentOptions([]);
      if (selectedSubDepartment) {
        // Only reset if there's a value
        setSelectedSubDepartment('');
      }
    }
  }, [selectedDepartment, departmentOptions]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selected = Array.from(e.target.files);

    const prepared: UploadedFile[] = [];
    for (let index = 0; index < selected.length; index++) {
      const file = selected[index];
      const base: UploadedFile = {
        id: Date.now() + index,
        name: file.name,
        type: file.type || file.name.split('.').pop()?.toUpperCase() || 'Unknown',
        size: `${(file.size / 1024).toFixed(2)} KB`,
        status: 'Pending',
        department: selectedDepartment
          ? departmentOptions.find((d) => d.label === selectedDepartment)?.label || 'Not specified'
          : 'Not specified',
        file,
      };

      const lower = file.name.toLowerCase();
      const isCsv = lower.endsWith('.csv');
      const isXlsx = lower.endsWith('.xlsx') || lower.endsWith('.xls');
      const isZip = lower.endsWith('.zip') || 
                    file.type === 'application/zip' || 
                    file.type === 'application/x-zip-compressed';

      // Client-side validation for CSV templates
      if (isCsv) {
        try {
          const { errors, rowCount } = await validateCsvTemplate(file);
          base.validationErrors = errors;
          base.parsedRows = rowCount;
          if (errors.length > 0) {
            toast.error(`Template issues in ${file.name}: ${errors.length} problem(s)`);
          }
        } catch (err) {
          base.validationErrors = ["Failed to parse CSV file."];
          base.parsedRows = 0;
          toast.error(`Failed to validate ${file.name}`);
        }
      }

      // Client-side validation for XLSX templates
      if (isXlsx) {
        try {
          const { errors, rowCount } = await validateXlsxTemplate(file);
          base.validationErrors = errors;
          base.parsedRows = rowCount;
          if (errors.length > 0) {
            toast.error(`Template issues in ${file.name}: ${errors.length} problem(s)`);
          }
        } catch (err) {
          base.validationErrors = ["Failed to parse Excel file."];
          base.parsedRows = 0;
          toast.error(`Failed to validate ${file.name}`);
        }
      }

      // ZIP file validation - check size and format
      if (isZip) {
        // Validate ZIP file size (e.g., max 100MB)
        const maxZipSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxZipSize) {
          base.validationErrors = [`ZIP file exceeds maximum size of ${(maxZipSize / 1024 / 1024).toFixed(0)}MB`];
          toast.error(`ZIP file ${file.name} is too large`);
        } else if (file.size === 0) {
          base.validationErrors = ['ZIP file is empty'];
          toast.error(`ZIP file ${file.name} appears to be empty`);
        } else {
          // ZIP looks valid - will be processed by backend
          toast.success(`ZIP file detected: ${file.name}. Backend will extract and process Excel + documents.`);
        }
      }

      prepared.push(base);
    }

    setFiles([...files, ...prepared]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.files) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const event = {
        target: { files: droppedFiles },
      } as unknown as ChangeEvent<HTMLInputElement>;
      handleFileUpload(event);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const deleteFile = (id: number) => {
    setFiles(files.filter((file) => file.id !== id));
  };

  // Expected headers for validation (Department/SubDepartment come from UI, not file)
  // Required minimal fields; Link ID is optional (update if present, create if missing)
  const REQUIRED_HEADERS = [
    'filename',
    'filedescription',
    'filedate',
  ];
  // Optional headers are accepted but not required: description, remarks, expiration, expiration date, confidential, active, publishing_status,
  // text1..text10, date1..date10, link id, page count, template name, type, created by

  function isValidDateString(v: string): boolean {
    if (!v) return false;
    // Accept YYYY-MM-DD
    const m = /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!m) return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
  }

  async function validateCsvTemplate(file: File): Promise<{ errors: string[]; rowCount: number }>{
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { errors: ['Empty file'], rowCount: 0 };

    // Naive CSV split (no quoted fields handling). Our template is simple.
    const headerLine = lines[0].replace(/^\uFEFF/, ''); // strip BOM if present
    const headersRaw = headerLine.split(',').map(h => h.trim());
    const headersLower = headersRaw.map(h => h.toLowerCase());
    const headersNoSpace = headersLower.map(h => h.replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''));
    const errors: string[] = [];

    // Header presence
    for (const req of REQUIRED_HEADERS) {
      if (!headersNoSpace.includes(req)) errors.push(`Missing required header: ${req}`);
    }

    // Allow extra headers: do not error, backend may ignore

    // Row validation
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length === 1 && row[0].trim() === '') continue; // skip empty line
      const rowObj: Record<string,string> = {};
      headersLower.forEach((h, idx) => {
        const v = (row[idx] ?? '').trim();
        const key = h.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        rowObj[h] = v; // original lower
        rowObj[key] = v; // normalized token
      });

      // Required fields
      if (!rowObj.filename) errors.push(`Row ${i+1}: FileName is required`);
      if (!rowObj.filedescription) errors.push(`Row ${i+1}: FileDescription is required`);
      if (!rowObj.filedate) errors.push(`Row ${i+1}: FileDate is required`);
      if (rowObj.filedate && !isValidDateString(rowObj.filedate)) errors.push(`Row ${i+1}: FileDate must be YYYY-MM-DD`);

      // Expiration logic
      const expVal = ((rowObj.expiration || rowObj['expiration']) || '').toLowerCase();
      if (['true','yes','1'].includes(expVal)) {
        const expDate = rowObj.expirationdate || rowObj['expiration date'];
        if (!expDate) errors.push(`Row ${i+1}: ExpirationDate required when Expiration is TRUE`);
        if (expDate && !isValidDateString(expDate)) errors.push(`Row ${i+1}: ExpirationDate must be YYYY-MM-DD`);
      }

      // DateN validation
      for (let d = 1; d <= 10; d++) {
        const keyNoSpace = `date${d}`;
        const val = rowObj[keyNoSpace] ?? rowObj[`date ${d}`];
        if (val && !isValidDateString(val)) errors.push(`Row ${i+1}: Date${d} must be YYYY-MM-DD`);
      }
    }

    return { errors, rowCount: Math.max(0, lines.length - 1) };
  }

  async function validateXlsxTemplate(file: File): Promise<{ errors: string[]; rowCount: number }>{
    // Lazy-load XLSX from CDN as ESM
    // @ts-ignore - dynamic ESM import via CDN
    const XLSX: any = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return { errors: ['No sheets found'], rowCount: 0 };
    const sheet = workbook.Sheets[firstSheetName];
    // Get 2D array: first row is headers
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    if (!rows || rows.length === 0) return { errors: ['Empty sheet'], rowCount: 0 };

    const headersLower: string[] = (rows[0] as string[]).map((h: string) => (h || '').trim().toLowerCase());
    const headersNoSpace: string[] = headersLower.map(h => h.replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''));
    const errors: string[] = [];

    for (const req of REQUIRED_HEADERS) {
      if (!headersNoSpace.includes(req)) errors.push(`Missing required header: ${req}`);
    }
    // Allow extra headers: do not error, backend may ignore

    // Helper to normalize possible Excel date values to YYYY-MM-DD
    const normalizeDate = (val: any): string => {
      if (val === undefined || val === null) return '';
      // Numeric Excel serial date
      if (typeof val === 'number') {
        const dc = XLSX.SSF.parse_date_code(val);
        if (dc && dc.y && dc.m && dc.d) {
          const mm = String(dc.m).padStart(2, '0');
          const dd = String(dc.d).padStart(2, '0');
          return `${dc.y}-${mm}-${dd}`;
        }
      }
      // String: try to parse common formats
      const s = String(val).trim();
      if (!s) return '';
      // Convert DD/MM/YYYY or D/M/YYYY -> YYYY-MM-DD
      const m1 = s.match(/^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{4})$/);
      if (m1) {
        const dd = m1[1].padStart(2, '0');
        const mm = m1[2].padStart(2, '0');
        const yyyy = m1[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      // Already YYYY-MM-DD
      const m2 = s.match(/^(\d{4})[\-\/](\d{2})[\-\/](\d{2})$/);
      if (m2) {
        return `${m2[1]}-${m2[2]}-${m2[3]}`;
      }
      // Fallback: Date constructor
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return s; // leave as-is; validator will catch if invalid
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      if (!row || row.length === 0 || row.every(c => (c ?? '').toString().trim() === '')) continue;
      const rowObj: Record<string,string> = {};
      headersLower.forEach((h, idx) => {
        const raw = row[idx] as any;
        // Normalize known date columns
        const hNoSpace = h.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        if (hNoSpace === 'filedate' || hNoSpace === 'expirationdate' || /^date\d+$/.test(hNoSpace)) {
          const nv = normalizeDate(raw);
          rowObj[h] = nv; // original lower
          rowObj[hNoSpace] = nv; // alias
        } else {
          const v = ((raw ?? '') as string).toString().trim();
          rowObj[h] = v;
          rowObj[hNoSpace] = v;
        }
      });

      if (!rowObj.filename) errors.push(`Row ${i+1}: FileName is required`);
      if (!rowObj.filedescription) errors.push(`Row ${i+1}: FileDescription is required`);
      if (!rowObj.filedate) errors.push(`Row ${i+1}: FileDate is required`);
      if (rowObj.filedate && !isValidDateString(rowObj.filedate)) errors.push(`Row ${i+1}: FileDate must be YYYY-MM-DD`);

      const expVal = ((rowObj.expiration || rowObj['expiration']) || '').toLowerCase();
      if (['true','yes','1'].includes(expVal)) {
        const expDate = rowObj.expirationdate || rowObj['expiration date'];
        if (!expDate) errors.push(`Row ${i+1}: ExpirationDate required when Expiration is TRUE`);
        if (expDate && !isValidDateString(expDate)) errors.push(`Row ${i+1}: ExpirationDate must be YYYY-MM-DD`);
      }

      for (let d = 1; d <= 10; d++) {
        const keyNoSpace = `date${d}`;
        const val = rowObj[keyNoSpace] ?? rowObj[`date ${d}`];
        if (val && !isValidDateString(val)) errors.push(`Row ${i+1}: Date${d} must be YYYY-MM-DD`);
      }
    }

    return { errors, rowCount: Math.max(0, rows.length - 1) };
  }

   const handleUpload = async () => {
    if (!files || files.length === 0) return;

    // Ensure context is selected
    if (!selectedDepartment || !selectedSubDepartment) {
      toast.error('Please select Department and Document Type first');
      return;
    }

    // Block upload if any CSV file has validation errors
    const hasBlockingErrors = files.some(f => {
      const lower = f.name.toLowerCase();
      const isCsv = lower.endsWith('.csv');
      return isCsv && f.validationErrors && f.validationErrors.length > 0;
    });
    if (hasBlockingErrors) {
      toast.error('Resolve CSV template errors before uploading.');
      return;
    }

    // Block upload if any ZIP file has validation errors
    const hasZipErrors = files.some(f => {
      const lower = f.name.toLowerCase();
      const isZip = lower.endsWith('.zip') || f.type === 'application/zip' || f.type === 'application/x-zip-compressed';
      return isZip && f.validationErrors && f.validationErrors.length > 0;
    });
    if (hasZipErrors) {
      toast.error('Resolve ZIP file errors before uploading.');
      return;
    }

    // Process all files, not just the first one
    let successCount = 0;
    for (const uploadedFile of files) {
      if (uploadedFile.status === 'Pending') {
        const formData = new FormData();
        
        // Determine file type and use appropriate endpoint
        const lowerFileName = uploadedFile.name.toLowerCase();
        const isZip = lowerFileName.endsWith('.zip') || 
                      uploadedFile.file.type === 'application/zip' || 
                      uploadedFile.file.type === 'application/x-zip-compressed';
        const isExcelOrCsv = uploadedFile.file.type.includes('excel') || 
                           uploadedFile.file.type.includes('spreadsheet') ||
                           uploadedFile.file.type.includes('csv') ||
                           lowerFileName.endsWith('.xlsx') ||
                           lowerFileName.endsWith('.xls') ||
                           lowerFileName.endsWith('.csv');

        if (isZip) {
          // Use batch upload endpoint for ZIP files (backend will extract and process)
          formData.append('batchupload', uploadedFile.file, uploadedFile.name);
          formData.append('isZip', 'true'); // Flag to indicate ZIP file
          // Append selected Department/SubDepartment IDs from dropdowns
          const depId = departmentOptions.find(d => d.label === selectedDepartment)?.value || '';
          const subId = subDepartmentOptions.find(s => s.label === selectedSubDepartment)?.value || '';
          if (!depId || !subId) {
            toast.error('Invalid Department or Document Type selection');
            continue;
          }
          formData.append('dep', String(depId));
          formData.append('subdep', String(subId));
        } else if (isExcelOrCsv) {
          // Use batch upload endpoint for Excel files
          formData.append('batchupload', uploadedFile.file, uploadedFile.name);
          // Append selected Department/SubDepartment IDs from dropdowns
          const depId = departmentOptions.find(d => d.label === selectedDepartment)?.value || '';
          const subId = subDepartmentOptions.find(s => s.label === selectedSubDepartment)?.value || '';
          if (!depId || !subId) {
            toast.error('Invalid Department or Document Type selection');
            continue;
          }
          formData.append('dep', String(depId));
          formData.append('subdep', String(subId));
        } else {
          // Use regular document upload for other file types
          formData.append('file', uploadedFile.file, uploadedFile.name);
          formData.append('FileName', uploadedFile.name);
          formData.append('FileDescription', `Batch uploaded: ${uploadedFile.name}`);
          formData.append('DepartmentId', selectedDepartment ? 
            departmentOptions.find(d => d.label === selectedDepartment)?.value || '1' : '1');
          formData.append('SubDepartmentId', selectedSubDepartment ? 
            subDepartmentOptions.find(s => s.label === selectedSubDepartment)?.value || '1' : '1');
          formData.append('FileDate', new Date().toISOString().split('T')[0]);
          formData.append('Confidential', 'false');
          formData.append('Active', 'true');
          formData.append('Expiration', 'false');
          formData.append('publishing_status', 'false');
        }

        try {
          const data = (isZip || isExcelOrCsv)
            ? await performBatchUpload(formData)
            : await performDocumentUpload(formData);
          
          // Log batch upload activity
          try {
            const uploadType = isZip ? 'ZIP Archive' : (isExcelOrCsv ? 'Spreadsheet' : 'Document');
            await logOCRActivity(
              'BATCH_UPLOAD_STARTED',
              user?.ID || 0,
              user?.UserName || 'Unknown User',
              (isZip || isExcelOrCsv) ? 0 : (data?.data?.ID || 0),
              uploadedFile.name,
              `Batch upload: ${uploadedFile.name} (${uploadType})`,
              true
            );
          } catch (logError) {
            console.warn('Failed to log batch upload activity:', logError);
          }
          
          // Update file status
          setFiles(prevFiles => 
            prevFiles.map(file => 
              file.id === uploadedFile.id 
                ? { ...file, status: 'Success' as const }
                : file
            )
          );
          successCount += 1;
          
          console.log(`Uploaded ${uploadedFile.name}:`, data);
          // Capture last response for spreadsheets/ZIP to show details
          if (isZip || isExcelOrCsv) {
            setLastBatchResponse(data);
            // Prefer backend-provided counts when available
            if (typeof (data as any)?.successfulUpdates === 'number' && typeof (data as any)?.failedUpdates === 'number') {
              const total = (data as any)?.totalDocuments ?? ((data as any)?.successfulUpdates + (data as any)?.failedUpdates);
              setLastBatchCount({ total, success: (data as any).successfulUpdates });
            }
          }
        } catch (error) {
          console.error(`Failed to upload ${uploadedFile.name}:`, error);
          toast.error(`Failed to upload ${uploadedFile.name}`);
        }
      }
    }
    
    // Log batch upload completion
    try {
      await logOCRActivity(
        'BATCH_UPLOAD_COMPLETED',
        user?.ID || 0,
        user?.UserName || 'Unknown User',
        0,
        `${files.length} files`,
        `Completed batch upload of ${files.length} files`,
        true
      );
    } catch (logError) {
      console.warn('Failed to log batch upload completion activity:', logError);
    }
    
    // Fallback count if backend didn't provide
    if (!lastBatchCount) {
      setLastBatchCount({ total: files.length, success: successCount });
    }
    toast.success(`Batch upload completed! Processed ${files.length} files.`);
  };

  if (loadingDepartments) {
    return <div>Loading departments...</div>;
  }

  return (
    <div className="bg-white shadow-md rounded-xl p-3 sm:p-6 space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-blue-800">Batch Upload</h2>
        <p className="mt-2 text-gray-600">
          Upload multiple documents (Excel, PDF, Images, Word, Text) for batch processing
        </p>
        <div className="mt-3">
          <a
            href="/batch_upload_template.csv"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm text-gray-800"
          >
            Download Template
          </a>
        </div>
      </header>

      {/* Context Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <div className="relative">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" hidden>
                Select Department
              </option>
              {departmentOptions.map((dept) => (
                <option key={dept.value} value={dept.label}>
                  {dept.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Type
          </label>
          <div className="relative">
            <select
              value={selectedSubDepartment}
              onChange={(e) => setSelectedSubDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedDepartment}
            >
              <option value="" hidden>
                {subDepartmentOptions.length === 0
                  ? 'No document types available'
                  : 'Select Document Type'}
              </option>
              {subDepartmentOptions.map((subDept) => (
                <option key={subDept.value} value={subDept.label}>
                  {subDept.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Rest of your component remains the same */}
      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-md p-6 text-center transition cursor-pointer ${
          selectedSubDepartment
            ? 'border-blue-300 bg-blue-50 hover:bg-blue-100'
            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        onClick={selectedSubDepartment ? triggerFileInput : undefined}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <p className="text-sm">
          {selectedSubDepartment
            ? 'Drag & drop files here or click to upload (Excel, ZIP with Excel + Documents, PDF, Images, Word, Text)'
            : 'Please select a department and document type first'}
        </p>
        <input
          type="file"
          accept=".xlsx, .xls, .csv, .zip, .pdf, .png, .jpg, .jpeg, .doc, .docx, .txt, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, application/zip, application/x-zip-compressed, application/pdf, image/png, image/jpeg, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
          disabled={!selectedSubDepartment}
          multiple
        />
      </div>

      {/* Upload Button */}
      <div className="flex justify-between items-center">
        {batchUploadPermissions?.Add && (
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm ${
              files.some((f) => f.status === 'Pending')
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!files.some((f) => f.status === 'Pending')}
            onClick={handleUpload}
          >
            <UploadCloud className="w-4 h-4" />
            Upload
          </button>
        )}

        {batchUploadPermissions?.Delete && files.length > 0 && (
          <button
            className="flex items-center gap-2 text-red-600 text-sm hover:underline"
            onClick={() => setFiles([])}
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Uploaded Files Table */}
      {files.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-black">
              <tr>
                <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                  Validation
                </th>
                <th className="px-6 py-3 text-base font-semibold text-gray-700 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b border-gray-200">
                  <td className="px-4 py-2 font-medium">{file.name}</td>
                  <td className="px-4 py-2">{file.type}</td>
                  <td className="px-4 py-2">{file.size}</td>
                  <td className="px-4 py-2">{file.department}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        file.status === 'Success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {file.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {(() => {
                      const lower = file.name.toLowerCase();
                      const isCsvOrXlsx = lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls');
                      const isZip = lower.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
                      
                      if (isZip) {
                        return file.validationErrors && file.validationErrors.length > 0 ? (
                          <span
                            className="text-red-600 text-xs underline cursor-help"
                            title={(file.validationErrors.slice(0, 5).join('\n')) + (file.validationErrors.length > 5 ? `\n...and ${file.validationErrors.length - 5} more` : '')}
                          >
                            {file.validationErrors.length} error(s) — hover to view
                          </span>
                        ) : (
                          <span className="text-blue-700 text-xs">
                            ZIP ready — will extract and process
                          </span>
                        );
                      } else if (isCsvOrXlsx) {
                        return file.validationErrors && file.validationErrors.length > 0 ? (
                          <span
                            className="text-red-600 text-xs underline cursor-help"
                            title={(file.validationErrors.slice(0, 5).join('\n')) + (file.validationErrors.length > 5 ? `\n...and ${file.validationErrors.length - 5} more` : '')}
                          >
                            {file.validationErrors.length} error(s) — hover to view
                          </span>
                        ) : (
                          <span className="text-green-700 text-xs">
                            {typeof file.parsedRows === 'number' ? `${file.parsedRows} row(s) validated` : 'Validated'}
                          </span>
                        );
                      } else {
                        return <span className="text-gray-500 text-xs">Validation for spreadsheet/ZIP templates only</span>;
                      }
                    })()}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      {batchUploadPermissions?.Delete && (
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => deleteFile(file.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-lg font-medium text-gray-900 mb-4">
            No files uploaded yet
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop files here or click to upload
          </p>
        </div>
      )}

      {/* Batch Result Panel */}
      {lastBatchCount && (
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <div className="text-sm text-gray-800 mb-2">
            Processed: {lastBatchCount.total} file(s), Success: {lastBatchCount.success}
          </div>
          {lastBatchResponse && (
            <details className="text-xs">
              <summary className="cursor-pointer text-blue-700">View raw server response</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{JSON.stringify(lastBatchResponse, null, 2)}</pre>
            </details>
          )}
          {(lastBatchResponse as any)?.processedDocuments && Array.isArray((lastBatchResponse as any).processedDocuments) && (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2">File Name</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {((lastBatchResponse as any).processedDocuments as any[]).map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="px-4 py-2">{row.fileName ?? '-'}</td>
                      <td className="px-4 py-2">{row.status ?? '-'}</td>
                      <td className="px-4 py-2 text-red-600">{row.error ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
