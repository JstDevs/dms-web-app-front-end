import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useAllocationPermissions } from '../Document/utils/useAllocationPermissions';
import { UploadCloud, Trash2, ChevronDown, FileText, Download, CheckCircle2, AlertCircle, X, FileCheck, Building2, FolderOpen } from 'lucide-react';
import { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import toast from 'react-hot-toast';
import { performBatchUpload, performDocumentUpload } from './utils/batchServices';
import { logOCRActivity } from '@/utils/activityLogger';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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
  const { user } = useAuth();
  
  // Get department and subdepartment IDs from selected values
  const selectedDeptId = departmentOptions.find(
    (dept) => dept.label === selectedDepartment
  )?.value;
  
  const selectedSubDeptId = subDepartmentOptions.find(
    (sub) => sub.label === selectedSubDepartment
  )?.value;
  
  // Fetch allocation permissions for selected department/subdepartment
  const { permissions: allocationPermissions } = useAllocationPermissions({
    departmentId: selectedDeptId ? Number(selectedDeptId) : null,
    subDepartmentId: selectedSubDeptId ? Number(selectedSubDeptId) : null,
    userId: user?.ID || null,
  });
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
    // Check Add permission before allowing file upload
    if (!allocationPermissions.Add) {
      toast.error('You do not have permission to upload documents in this department and document type.');
      return;
    }
    
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
    
    // Check Add permission before allowing file drop
    if (!allocationPermissions.Add) {
      toast.error('You do not have permission to upload documents in this department and document type.');
      return;
    }
    
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
    // Check Add permission before allowing upload
    if (!allocationPermissions.Add) {
      toast.error('You do not have permission to upload documents in this department and document type.');
      return;
    }
    
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      {/* Enhanced Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl shadow-xl p-6 sm:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">Batch Upload</h1>
                <p className="mt-1 text-base text-blue-100">
                  Upload multiple documents with Excel templates or ZIP archives
                </p>
              </div>
            </div>
            <a
              href="/batch_upload_template.csv"
              download
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm border border-white border-opacity-30 text-white font-medium transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Download className="w-5 h-5" />
              Download Template
            </a>
          </div>
        </div>
      </header>

      {/* Context Selection Card */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-800">Document Context</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Select department and document type for batch processing</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-black">
            {/* Department */}
            <div className="col-span-1 space-y-2">
              <label className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-700">
                <Building2 className="w-4 h-4 text-blue-600" />
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm text-gray-700"
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
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Document Type */}
            <div className="col-span-1 space-y-2">
              <label className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-700">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                Document Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedSubDepartment}
                  onChange={(e) => setSelectedSubDepartment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm text-gray-700 disabled:bg-gray-50 disabled:cursor-not-allowed"
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
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Drag and Drop Area */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 ${
              selectedSubDepartment && allocationPermissions.Add
                ? 'border-gray-300 hover:border-blue-500 hover:shadow-lg'
                : 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            onClick={selectedSubDepartment && allocationPermissions.Add ? triggerFileInput : undefined}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {!selectedSubDepartment ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <AlertCircle className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-base font-medium text-gray-600">
                  Please select a department and document type first
                </p>
              </div>
            ) : !allocationPermissions.Add ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <AlertCircle className="w-10 h-10 text-yellow-500 mb-3" />
                <p className="text-base font-medium text-gray-600">
                  You do not have permission to upload documents in this department and document type
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative p-4 bg-blue-600 rounded-full">
                    <UploadCloud className="w-10 h-10 text-white" />
                  </div>
                </div>
                <p className="mb-2 text-base font-semibold text-gray-700">
                  <span className="text-blue-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Excel, CSV, ZIP, PDF, Images, Word, Text files
                </p>
              </div>
            )}
            <input
              type="file"
              accept=".xlsx, .xls, .csv, .zip, .pdf, .png, .jpg, .jpeg, .doc, .docx, .txt, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, application/zip, application/x-zip-compressed, application/pdf, image/png, image/jpeg, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={!selectedSubDepartment || !allocationPermissions.Add}
              multiple
            />
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Action Buttons */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {files.length > 0 && (
                <>
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">
                    {files.length} file{files.length > 1 ? 's' : ''} ready to upload
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              {allocationPermissions?.Delete && files.length > 0 && (
                <button
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={() => setFiles([])}
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
              {allocationPermissions?.Add && (
                <button
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                    files.some((f) => f.status === 'Pending')
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                      : 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
                  }`}
                  disabled={!files.some((f) => f.status === 'Pending')}
                  onClick={handleUpload}
                >
                  <UploadCloud className="w-5 h-5" />
                  Upload {files.length > 0 ? `(${files.filter(f => f.status === 'Pending').length})` : ''}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files Table */}
      {files.length > 0 ? (
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Uploaded Files</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Validation
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{file.type}</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {file.size}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            file.status === 'Success'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {file.status === 'Success' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {file.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {(() => {
                          const lower = file.name.toLowerCase();
                          const isCsvOrXlsx = lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls');
                          const isZip = lower.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
                          
                          if (isZip) {
                            return file.validationErrors && file.validationErrors.length > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 cursor-help"
                                title={(file.validationErrors.slice(0, 5).join('\n')) + (file.validationErrors.length > 5 ? `\n...and ${file.validationErrors.length - 5} more` : '')}
                              >
                                <AlertCircle className="w-3 h-3" />
                                {file.validationErrors.length} error(s)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Ready
                              </span>
                            );
                          } else if (isCsvOrXlsx) {
                            return file.validationErrors && file.validationErrors.length > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 cursor-help"
                                title={(file.validationErrors.slice(0, 5).join('\n')) + (file.validationErrors.length > 5 ? `\n...and ${file.validationErrors.length - 5} more` : '')}
                              >
                                <AlertCircle className="w-3 h-3" />
                                {file.validationErrors.length} error(s)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                                <CheckCircle2 className="w-3 h-3" />
                                {typeof file.parsedRows === 'number' ? `${file.parsedRows} row(s)` : 'Valid'}
                              </span>
                            );
                          } else {
                            return <span className="text-xs text-gray-400">-</span>;
                          }
                        })()}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        {allocationPermissions?.Delete && (
                          <button
                            className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors"
                            onClick={() => deleteFile(file.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-0">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                No files uploaded yet
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Result Panel */}
      {lastBatchCount && (
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Upload Results</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Processed: <span className="font-semibold text-green-700">{lastBatchCount.total}</span> file(s), 
                  Success: <span className="font-semibold text-green-700">{lastBatchCount.success}</span>
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {lastBatchResponse && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-blue-700 hover:text-blue-800 mb-3 inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  View raw server response
                </summary>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono text-gray-700">
                    {JSON.stringify(lastBatchResponse, null, 2)}
                  </pre>
                </div>
              </details>
            )}
            {(lastBatchResponse as any)?.processedDocuments && Array.isArray((lastBatchResponse as any).processedDocuments) && (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">File Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {((lastBatchResponse as any).processedDocuments as any[]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.fileName ?? '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            row.status && row.status.toLowerCase().includes('fail')
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            {row.status && !row.status.toLowerCase().includes('fail') && <CheckCircle2 className="w-3 h-3" />}
                            {row.status && row.status.toLowerCase().includes('fail') && <X className="w-3 h-3" />}
                            {row.status ?? '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600">{row.error ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
