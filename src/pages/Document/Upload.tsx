import { DeleteDialog } from '@/components/ui/DeleteDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
// import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import { Button } from '@chakra-ui/react';
import {
  // BookCheck,
  Edit,
  FileIcon,
  Search,
  Trash,
  Trash2,
  UploadCloud,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  editDocument,
  fetchDocuments,
  uploadFile,
  deleteDocument,
} from './utils/uploadAPIs';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildDocumentFormData,
  DocumentUploadProp,
} from './utils/documentHelpers';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { logDocumentActivity } from '@/utils/activityLogger';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useFieldAllocations } from './utils/useFieldAllocations';
import { DynamicFieldsSection } from './components/DynamicFields';
interface DocumentWrapper {
  newdoc: DocumentUploadProp;
  isRestricted: boolean;
  restrictions: any[]; // or define a proper type for restrictions
}
const allowedTypes = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain', // .txt
];
export default function DocumentUpload() {
  const [documents, setDocuments] = useState<DocumentWrapper[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [paginationData, setPaginationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<{ [key: string]: string | null }>({});
  const [newDoc, setNewDoc] = useState<Partial<DocumentUploadProp>>({
    FileName: '',
    FileDescription: '',
    DepartmentId: 0,
    SubDepartmentId: 0,
    FileDate: '',
    ExpirationDate: '',
    Confidential: false,
    Description: '',
    Remarks: '',
    Active: true,
    Expiration: false,
    publishing_status: false,
  });
  // Add a ref at the top of your component
  const fileInputRef = useRef<HTMLInputElement | null>(null); // Properly type the ref
  // const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const { departmentOptions, getSubDepartmentOptions, loading } =
    useNestedDepartmentOptions();
  const { selectedRole, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const uploadPermissions = useModulePermissions(3); // 1 = MODULE_ID
  
  // Field allocations hook - don't pass userId to always show all active fields from allocation
  const {
    userPermissions,
    loading: fieldsLoading,
    error: fieldsError,
    getActiveFields,
  } = useFieldAllocations({
    departmentId: newDoc.DepartmentId || null,
    subDepartmentId: newDoc.SubDepartmentId || null,
    userId: null, // Always use available fields to show all active fields from allocation
  });
  const loadDocuments = async () => {
    try {
      const { data } = await fetchDocuments(
        Number(selectedRole?.ID),
        currentPage
      );
      setDocuments(data.documents);
      setPaginationData(data.pagination);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };
  useEffect(() => {
    loadDocuments();
  }, [selectedRole, currentPage]);
  // console.log({ documents });
  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];

      // Validate type
      if (!allowedTypes.includes(file.type)) {
        toast.error('❌ Invalid file type. Allowed types: PNG, JPEG, PDF, DOCX, XLSX, TXT');
        e.target.value = ''; // reset input
        return;
      }

      // Validate size (50MB for better support)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('❌ File is too large. Max size is 50MB.');
        e.target.value = ''; // reset input
        return;
      }

      setSelectedFile(file);
      setUploadProgress(0);
    }
  };

  const handleAddDocument = async () => {
    // console.log({ newDoc, selectedFile });
    setIsLoading(true);
    setUploadProgress(0);
    try {
      // Prepare dynamic fields data - map field IDs to backend column format
      // Backend expects field values in Text1-10 or Date1-10 format based on FieldNumber
      const dynamicFieldsData: { [key: string]: any } = {};
      const activeFields = getActiveFields();
      
      Object.entries(dynamicFieldValues).forEach(([key, value]) => {
        if (value !== null && value !== '' && value.trim() !== '') {
          // Extract field ID from key (format: field_123)
          const fieldId = Number(key.replace('field_', ''));
          
          // Find the field from active fields to get its type and FieldNumber
          const field = activeFields.find(f => f.ID === fieldId);
          
          if (field) {
            // Map field ID to column name based on FieldNumber
            // The backend expects fields in format: text1, text2, date1, date2, etc.
            // FieldNumber corresponds to the column number (1-10)
            const fieldNumber = field.FieldNumber || field.ID;
            
            // Ensure fieldNumber is between 1-10 (database columns limit)
            const columnNumber = ((fieldNumber - 1) % 10) + 1;
            
            if (field.Type === 'date' || field.Type === 'Date') {
              // Format date properly for backend (YYYY-MM-DD)
              const dateValue = value ? new Date(value).toISOString().slice(0, 10) : '';
              if (dateValue) {
                dynamicFieldsData[`date${columnNumber}`] = dateValue;
              }
            } else {
              // Text field - use lowercase for backend
              dynamicFieldsData[`text${columnNumber}`] = String(value).trim();
            }
          } else {
            // Fallback: use field_ prefix if field not found
            dynamicFieldsData[`field_${fieldId}`] = value;
          }
        }
      });

      // Merge dynamic fields into newDoc object for proper submission
      // Backend expects fields as Text1, Date1, etc. (uppercase) in the document object
      const docWithFields = { ...newDoc };
      Object.entries(dynamicFieldsData).forEach(([key, value]) => {
        // Convert lowercase keys to uppercase: text1 -> Text1, date1 -> Date1
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
        (docWithFields as any)[formattedKey] = value;
      });
      
      // Don't pass dynamicFields separately since we've merged them into docWithFields
      // This prevents duplicate appending which causes the "cannot be an array" error
      const formData = buildDocumentFormData(docWithFields, selectedFile, true, undefined, undefined);
      
      // Debug: Log what we're sending
      console.log('Dynamic fields data being sent:', dynamicFieldsData);
      console.log('Active fields:', activeFields);
      
      // Log FormData entries for debugging
      console.log('FormData entries (fields):');
      for (const [key, value] of formData.entries()) {
        if (key.toLowerCase().startsWith('text') || key.toLowerCase().startsWith('date') || key.toLowerCase().startsWith('field_')) {
          console.log(`  ${key}: ${value}`);
        }
      }
      console.log('Doc with fields:', docWithFields);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadFile(formData);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.status) {
        // Log document creation activity
        try {
          await logDocumentActivity(
            'CREATED',
            selectedRole!.ID,
            user!.UserName,
            response.data?.ID || 0,
            newDoc.FileName || 'Unknown Document',
            `Uploaded by ${user!.UserName}`
          );
        } catch (logError) {
          console.warn('Failed to log document creation activity:', logError);
        }
        
        toast.success('Document Added Successfully');
        await loadDocuments();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Add document failed:', error);
      toast.error('Failed to add document');
    } finally {
      resetForm();
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateDocument = async () => {
    if (!editId) return;
    setIsLoading(true);
    try {
      const formData = buildDocumentFormData(
        newDoc,
        selectedFile,
        false,
        editId
      );
      const response = await editDocument(formData);

      if (response.status) {
        // Log document update activity
        try {
          await logDocumentActivity(
            'UPDATED',
            selectedRole!.ID,
            user!.UserName,
            editId,
            newDoc.FileName || 'Unknown Document',
            `Updated by ${user!.UserName}`
          );
        } catch (logError) {
          console.warn('Failed to log document update activity:', logError);
        }
        
        await loadDocuments();
        toast.success('Document Updated Successfully');
      } else {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Update document failed:', error);
      toast.error('Failed to update document ' + error.message);
    } finally {
      resetForm();
      setIsLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    const isDocumentNameExists = documents.some(
      (docWrapper: { newdoc: DocumentUploadProp }) => {
        const doc = docWrapper.newdoc;
        return (
          doc.FileName === newDoc.FileName && (!editId || doc.ID !== editId)
        );
      }
    );
    if (isDocumentNameExists) {
      toast.error('Document Name Already Exists');
      return;
    }

    try {
      editId ? await handleUpdateDocument() : await handleAddDocument();
    } catch (error) {
      console.error('Failed to add or update document:', error);
      toast.error('Failed to add or update document');
    }
  };

  const resetForm = () => {
    setNewDoc({
      FileName: '',
      FileDescription: '',
      DepartmentId: 0,
      SubDepartmentId: 0,
      FileDate: '',
      ExpirationDate: '',
      Confidential: false,
      Description: '',
      Remarks: '',
      Active: true,
      Expiration: false,
      publishing_status: false,
    });
    setDynamicFieldValues({});
    handleRemoveFile();
    setEditId(null);
    setUploadProgress(0);
  };

  const handleEdit = (id: number) => {
    const doc = documents.find((d) => d.newdoc.ID === id);
    if (doc) {
      setNewDoc(doc.newdoc);
      setEditId(id);
      handleRemoveFile();
    }
  };
  // console.log(newDoc);
  const handleDelete = async (id: number) => {
    try {
      const documentToDelete = documents.find(d => d.newdoc.ID === id);
      await deleteDocument(id);
      
      // Log document deletion activity
      if (documentToDelete) {
        try {
          await logDocumentActivity(
            'DELETED',
            selectedRole!.ID,
            user!.UserName,
            id,
            documentToDelete.newdoc.FileName,
            `Deleted by ${user!.UserName}`
          );
        } catch (logError) {
          console.warn('Failed to log document deletion activity:', logError);
        }
      }
      
      toast.success('Document deleted successfully');
      setDocuments((prev) => prev.filter((d) => d.newdoc.ID !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const filteredDocs = documents.filter((docWrapper) => {
    const doc = docWrapper.newdoc;
    return (
      (doc.FileName || '').toLowerCase().includes(search.toLowerCase()) ||
      (doc.FileDescription || doc.Description || '')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  const isFormValid = () => {
    // Basic required fields
    const baseValidation =
      newDoc.DepartmentId &&
      newDoc.SubDepartmentId &&
      newDoc.FileDescription &&
      newDoc.FileDate &&
      newDoc.FileName;
    
    // Use module permissions (uploadPermissions) instead of userPermissions
    // since userPermissions might be false when using available fields
    const hasPermission = uploadPermissions.Add === true;
    
    if (!baseValidation || !hasPermission) {
      return false;
    }
    
    // For edit mode, don't require file
    if (editId) {
      return true; // Basic validation passed, permissions OK
    }
    
    // For add mode, require file
    if (!selectedFile) {
      return false;
    }
    
    // Check required dynamic fields - only check if there are active fields
    // and only validate fields that are explicitly marked as required
    const activeFields = getActiveFields();
    if (activeFields.length > 0) {
      // Only require fields that are explicitly marked as required (Add: true)
      // Make sure Add is explicitly true, not just truthy
      const requiredFields = activeFields.filter(field => field.Add === true);
      if (requiredFields.length > 0) {
        const allRequiredFilled = requiredFields.every(field => {
          const value = dynamicFieldValues[`field_${field.ID}`];
          return value !== null && value !== '' && value.trim() !== '';
        });
        if (!allRequiredFilled) {
          return false;
        }
      }
    }
    
    return true;
  };

  const handlePublish = async (docWrapper: DocumentWrapper) => {
    try {
      const doc = docWrapper.newdoc;
      // Create payload with publishing_status set to true
      const publishDoc = {
        ...doc,
        publishing_status: true,
      };

      const formData = buildDocumentFormData(publishDoc, null, false, doc.ID);
      const { status } = await editDocument(formData);

      if (!status) throw new Error('Failed to publish document');

      setDocuments((prev) =>
        prev.map((d) =>
          d.newdoc.ID === doc.ID
            ? { ...d, newdoc: { ...d.newdoc, publishing_status: true } }
            : d
        )
      );
      toast.success('Document published successfully');
    } catch (error) {
      console.error('Failed to publish document:', error);
      toast.error('Failed to publish document');
    }
  };
  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().split('T')[0];
  };
  // Modify your remove file handler
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the input value
    }
  };

  const handleDynamicFieldChange = (fieldId: number, value: string) => {
    setDynamicFieldValues(prev => ({
      ...prev,
      [`field_${fieldId}`]: value
    }));
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-3 sm:p-6 space-y-6">
      {/* Header */}
      <header className="text-left">
        <h1 className="text-3xl font-bold text-blue-800">Upload</h1>
        <p className="mt-1 text-base text-gray-600">
          Upload files to the system for easy access and organization.
        </p>
      </header>

      {/* Form Section */}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 text-black">
          {/* Department */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">
              Department <span className="text-red-500">*</span>{' '}
            </label>

            <Select
              placeholder="Select a department"
              value={newDoc.DepartmentId?.toString() || ''}
              onChange={(e) => {
                const deptId = Number(e.target.value);
                setNewDoc({
                  ...newDoc,
                  DepartmentId: deptId,
                  SubDepartmentId: 0, // Reset document type when department changes
                });
              }}
              options={departmentOptions}
              disabled={loading}
            />
          </div>

          {/* Document Type */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">
              Document Type <span className="text-red-500">*</span>{' '}
            </label>

            <Select
              placeholder={
                !newDoc.DepartmentId
                  ? 'Select a Department First'
                  : getSubDepartmentOptions(newDoc.DepartmentId).length === 0
                  ? 'No Document Types Available'
                  : 'Select a Document Type'
              }
              value={newDoc.SubDepartmentId?.toString() || ''}
              onChange={(e) =>
                setNewDoc({
                  ...newDoc,
                  SubDepartmentId: Number(e.target.value),
                })
              }
              options={getSubDepartmentOptions(newDoc.DepartmentId || 0)}
              disabled={!newDoc.DepartmentId || loading}
            />
          </div>

          {/* File Description */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">
              File Description <span className="text-red-500">*</span>{' '}
            </label>
            <Input
              className="w-full"
              value={newDoc.FileDescription || ''}
              onChange={(e) =>
                setNewDoc({ ...newDoc, FileDescription: e.target.value })
              }
              required
              placeholder="Enter file description"
            />
          </div>

          {/* File Date */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">
              File Date <span className="text-red-500">*</span>{' '}
            </label>
            <Input
              type="date"
              value={formatDateForInput(newDoc.FileDate || '')}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                setNewDoc({
                  ...newDoc,
                  FileDate: date ? date.toISOString() : undefined,
                });
              }}
            />
          </div>

          {/* File Name */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">
              File Name <span className="text-red-500">*</span>{' '}
            </label>
            <Input
              className="w-full"
              value={newDoc.FileName || ''}
              onChange={(e) =>
                setNewDoc({ ...newDoc, FileName: e.target.value })
              }
              required
              placeholder="Enter file name"
            />
          </div>

          {/* Description */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Description</label>
            <Input
              className="w-full"
              value={newDoc.Description || ''}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Description: e.target.value })
              }
              placeholder="Enter description"
            />
          </div>
          {/* Remarks */}
          <div className="col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base">Remarks</label>
            <textarea
              className="w-full border rounded p-2 text-sm sm:text-base"
              rows={3}
              value={newDoc.Remarks || ''}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Remarks: e.target.value })
              }
              placeholder="Enter remarks"
            ></textarea>
          </div>

          {/* Attachment */}
          {!editId && (
            <div className="col-span-1 sm:col-span-2">
              <label className="text-sm sm:text-base">
                Attachment <span className="text-red-500">*</span>
              </label>
              {!selectedFile ? (
                // Dropzone UI
                <div
                  className={`mt-1 border-2 border-dashed rounded-lg cursor-pointer h-32 flex items-center justify-center transition-colors ${
                    selectedFile
                      ? 'border-blue-500'
                      : 'border-gray-300 hover:border-blue-500'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add(
                      'border-blue-500',
                      'bg-blue-50'
                    );
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove(
                      'border-blue-500',
                      'bg-blue-50'
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove(
                      'border-blue-500',
                      'bg-blue-50'
                    );

                    if (e.dataTransfer.files?.length) {
                      const file = e.dataTransfer.files[0];
                      setSelectedFile(file);
                      if (fileInputRef.current) {
                        fileInputRef.current.files = e.dataTransfer.files; // keep input in sync
                      }
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPEG, PDF, DOCX, XLSX, TXT up to 50MB
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleAttach}
                    accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.txt,image/png,image/jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                    required
                  />
                </div>
              ) : (
                // File Preview UI
                <div className="flex flex-col gap-3 mt-2 border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <FileIcon className="w-5 h-5 text-blue-500" />
                      <span>{selectedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="ml-2 text-red-400 hover:text-red-800"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Conditional Preview */}
                  {selectedFile.type.startsWith('image/') && (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-64 h-64 object-cover rounded-lg shadow-sm border"
                    />
                  )}

                  {selectedFile.type === 'application/pdf' && (
                    <iframe
                      src={URL.createObjectURL(selectedFile)}
                      title="PDF Preview"
                      className="w-full h-64 border rounded-lg"
                    />
                  )}
                </div>
              )}
            </div>
          )}
          {/* Confidential Checkbox */}
          <div className="col-span-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={newDoc.Confidential || false}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Confidential: e.target.checked })
              }
              id="confidential"
              className="h-4 w-4"
            />
            <label
              className="text-sm sm:text-base cursor-pointer"
              htmlFor="confidential"
            >
              Confidential
            </label>
          </div>

          {/* Expiration Checkbox */}
          <div className="col-span-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={newDoc.Expiration || false}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Expiration: e.target.checked })
              }
              id="expiration"
              className="h-4 w-4"
            />
            <label
              className="text-sm sm:text-base cursor-pointer"
              htmlFor="expiration"
            >
              Has Expiration
            </label>
          </div>

          {/* Expiration Date - Conditionally rendered */}
          {newDoc.Expiration && (
            <div className="col-span-1">
              <label className="text-sm sm:text-base">
                Expiration Date <span className="text-red-500">*</span>{' '}
              </label>
              <Input
                type="date"
                className="w-full"
                value={
                  newDoc.ExpirationDate
                    ? newDoc.ExpirationDate.split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setNewDoc({
                    ...newDoc,
                    ExpirationDate: e.target.value
                      ? `${e.target.value}T00:00:00.000Z`
                      : undefined,
                  })
                }
                required={newDoc.Expiration}
                placeholder="Enter expiration date"
              />
            </div>
          )}
        </div>

        {/* Dynamic Fields Section - Shows only active fields from allocation */}
        {newDoc.DepartmentId && newDoc.SubDepartmentId && (
          <>
            {fieldsLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading field configuration...</span>
              </div>
            )}
            
            {!fieldsLoading && !fieldsError && getActiveFields().length > 0 && (
              <DynamicFieldsSection
                fields={getActiveFields()}
                values={dynamicFieldValues}
                onChange={handleDynamicFieldChange}
                requiredFields={getActiveFields().filter(field => field.Add).map(field => field.ID)}
              />
            )}

            {!fieldsLoading && !fieldsError && getActiveFields().length === 0 && (
              <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500 rounded-lg flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800 mb-1">
                      No Active Fields Configured
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      No active fields are configured for this Department and Document Type combination. 
                      Please configure and activate fields in the{' '}
                      <span className="font-medium text-blue-600">Allocation</span> section first.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Fields error */}
        {fieldsError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ Unable to load field configuration. You can still upload with basic fields.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center gap-4 max-sm:flex-col">
          <Button
            onClick={resetForm}
            className="w-full sm:w-2/3 md:w-1/3 px-2 bg-gray-200 text-black hover:bg-gray-300"
            // disabled={!isFormValid()}
          >
            Cancel
          </Button>
          {/* // TODO ADD PROGRESS BAR HERE */}
          {uploadPermissions.Add && (
            <Button
              onClick={handleAddOrUpdate}
              className={`w-full sm:w-2/3 md:w-1/3 px-2 bg-blue-600 text-white hover:bg-blue-700 ${
                !isFormValid() || isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!isFormValid() || isLoading}
              title={
                !isFormValid()
                  ? `Form validation failed. Check: ${
                      !newDoc.DepartmentId ? 'Department, ' : ''
                    }${
                      !newDoc.SubDepartmentId ? 'Document Type, ' : ''
                    }${
                      !newDoc.FileDescription ? 'File Description, ' : ''
                    }${
                      !newDoc.FileDate ? 'File Date, ' : ''
                    }${
                      !newDoc.FileName ? 'File Name, ' : ''
                    }${
                      !selectedFile && !editId ? 'File attachment, ' : ''
                    }Required fields`
                  : ''
              }
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Uploading...'}
                </div>
              ) : editId ? (
                'Update Document'
              ) : (
                'Add Document'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Document List Section */}
      {/* <div className="space-y-4"> */}
        {/* Search and Title */}
        {/* <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-lg font-semibold w-full sm:w-auto">
            Document List
          </h2>
          <Input
            className="w-full sm:w-1/2"
            placeholder="Search by Name or Description"
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredDocs.length === 0 ? (
          <p className="text-gray-600 text-center py-6 text-base sm:text-lg font-semibold">
            No documents found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm border mt-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider  whitespace-nowrap">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Link ID
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    File Date
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Expiration Date
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Sub-Department
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Confidential
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Active
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-6 py-3 text-base font-semibold text-gray-700 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((docWrapper) => {
                  const doc = docWrapper.newdoc;
                  // Find current department
                  const currentDepartment =
                    departmentOptions.find(
                      (dep) =>
                        dep.value.toString() === doc.DepartmentId.toString()
                    )?.label || 'N/A';

                  // Get sub-department options for this department
                  const subDeptOptions = getSubDepartmentOptions(
                    doc.DepartmentId
                  );

                  // Find current sub-department
                  const currentSubDepartment =
                    subDeptOptions.find(
                      (sub) =>
                        sub.value.toString() === doc.SubDepartmentId.toString()
                    )?.label || 'N/A';
                  return (
                    <tr key={doc.ID}>
                      <td className="border px-6 py-3">{doc.ID}</td>
                      <td className="border px-6 py-3">{doc.FileName}</td>
                      <td className="border px-6 py-3">{doc.LinkID}</td>
                      <td className="border px-6 py-3">
                        {doc.Description || '-'}
                      </td>
                      <td className="border px-6 py-3">{doc.Remarks || '-'}</td>
                      <td className="border px-6 py-3">
                        {doc.FileDate
                          ? new Date(doc.FileDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="border px-6 py-3">
                        {doc.Expiration
                          ? new Date(doc.ExpirationDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="border px-6 py-3">{currentDepartment}</td>
                      <td className="border px-6 py-3">
                        {currentSubDepartment}
                      </td>
                      <td className="border px-6 py-3">
                        {doc.Confidential ? 'Yes' : 'No'}
                      </td>
                      <td className="border px-6 py-3">
                        {doc.Active ? 'Yes' : 'No'}
                      </td>
                      <td className="border px-6 py-3">
                        {doc.publishing_status ? (
                          <span className="text-gray-900">Published</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(docWrapper)}
                            className="w-full sm:flex-1 text-green-600 hover:text-green-800"
                          >
                            <UploadCloud className="h-4 w-4" />
                            Publish
                          </Button>
                        )}
                      </td>
                      <td className="border px-6 py-3">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                          {uploadPermissions.Edit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(doc.ID)}
                              className="w-full sm:flex-1 text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                          )}
                          {uploadPermissions.Delete && (
                            <DeleteDialog
                              onConfirm={() => handleDelete(doc.ID)}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full sm:flex-1 text-red-600 hover:text-red-700 "
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </DeleteDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls
          currentPage={currentPage}
          totalItems={paginationData?.totalItems}
          itemsPerPage={10}
          onPageChange={setCurrentPage}
          // onItemsPerPageChange={setItemsPerPage}
        />
      </div> */}
    </div>
  );
}
