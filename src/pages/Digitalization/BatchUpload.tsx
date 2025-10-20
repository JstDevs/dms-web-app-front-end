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

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles: UploadedFile[] = Array.from(e.target.files).map(
      (file, index) => ({
        id: Date.now() + index,
        name: file.name,
        type:
          file.type || file.name.split('.').pop()?.toUpperCase() || 'Unknown',
        size: `${(file.size / 1024).toFixed(2)} KB`,
        status: 'Pending',
        department: selectedDepartment
          ? departmentOptions.find((d) => d.label === selectedDepartment)
              ?.label || 'Not specified'
          : 'Not specified',
        file,
      })
    );

    setFiles([...files, ...newFiles]);
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

  const handleUpload = async () => {
    if (!files || files.length === 0) return;

    // Process all files, not just the first one
    for (const uploadedFile of files) {
      if (uploadedFile.status === 'Pending') {
        const formData = new FormData();
        
        // Determine file type and use appropriate endpoint
        const isExcelFile = uploadedFile.file.type.includes('excel') || 
                           uploadedFile.file.type.includes('spreadsheet') ||
                           uploadedFile.name.toLowerCase().endsWith('.xlsx') ||
                           uploadedFile.name.toLowerCase().endsWith('.xls');

        if (isExcelFile) {
          // Use batch upload endpoint for Excel files
          formData.append('batchupload', uploadedFile.file, uploadedFile.name);
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
          const data = isExcelFile 
            ? await performBatchUpload(formData)
            : await performDocumentUpload(formData);
          
          // Log batch upload activity
          try {
            await logOCRActivity(
              'BATCH_UPLOAD_STARTED',
              user?.ID || 0,
              user?.UserName || 'Unknown User',
              isExcelFile ? 0 : (data?.data?.ID || 0),
              uploadedFile.name,
              `Batch upload: ${uploadedFile.name} (${isExcelFile ? 'Excel' : 'Document'})`,
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
          
          console.log(`Uploaded ${uploadedFile.name}:`, data);
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
            ? 'Drag & drop files here or click to upload (Excel, PDF, Images, Word, Text)'
            : 'Please select a department and document type first'}
        </p>
        <input
          type="file"
          accept=".xlsx, .xls, .pdf, .png, .jpg, .jpeg, .doc, .docx, .txt, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf, image/png, image/jpeg, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain"
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
    </div>
  );
};
