import { Select } from '@/components/ui/Select';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { Button } from '@chakra-ui/react';
import { useRef, useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTemplates } from './utils/useTemplates';
import { useAuth } from '@/contexts/AuthContext';
import {
  UnrecordedDocument,
  useUnrecordedDocuments,
} from './utils/useUnrecorded';
import { runOCR } from './utils/unrecordedHelpers';
import { useDocument } from '@/contexts/DocumentContext';
import { CurrentDocument } from '@/types/Document';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { logOCRActivity } from '@/utils/activityLogger';
import { Search, X, FileText, Loader2, Eye, Play } from 'lucide-react';

interface FormData {
  department: string;
  subdepartment: string;
  template: string;
  accessId: string;
  selectedDoc: UnrecordedDocument | null;
  isLoaded: boolean;
  previewUrl: string;
  lastFetchedValues?: {
    department: string;
    subdepartment: string;
    template: string;
  };
}

interface ProcessingState {
  isLoadingDocuments: boolean;
  isProcessingOCR: boolean;
  isPreviewing: boolean;
  searchTerm: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OCRUnrecordedUI = () => {
  const [formData, setFormData] = useState<FormData>({
    department: '',
    subdepartment: '',
    template: '',
    accessId: '',
    selectedDoc: null,
    isLoaded: false,
    previewUrl: '',
  });
  
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isLoadingDocuments: false,
    isProcessingOCR: false,
    isPreviewing: false,
    searchTerm: '',
  });
  
  const imgRef = useRef<HTMLImageElement>(null);

  const {
    departmentOptions,
    getSubDepartmentOptions,
    loading: loadingDepartments,
  } = useNestedDepartmentOptions();
  const [subDepartmentOptions, setSubDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const { templateOptions } = useTemplates();
  const { selectedRole, user } = useAuth();
  const { unrecordedDocuments, fetchUnrecorded, loading: loadingDocuments } = useUnrecordedDocuments();
  const [currentUnrecoredDocument, setCurrentUnrecordedDocument] =
    useState<CurrentDocument | null>(null);
  const { fetchDocument } = useDocument();
  const unrecordedPermissions = useModulePermissions(9); // 1 = MODULE_ID
  
  // Filter documents based on search term
  const filteredDocuments = useMemo(() => {
    if (!processingState.searchTerm.trim()) {
      return unrecordedDocuments;
    }
    
    return unrecordedDocuments.filter(doc =>
      doc.FileName.toLowerCase().includes(processingState.searchTerm.toLowerCase())
    );
  }, [unrecordedDocuments, processingState.searchTerm]);
  
  // Update sub-departments when department selection changes
  useEffect(() => {
    if (formData.department && departmentOptions.length > 0) {
      const selectedDeptId = departmentOptions.find(
        (dept) => dept.value === formData.department
      )?.value;
      console.log({ selectedDeptId });
      if (selectedDeptId) {
        const subs = getSubDepartmentOptions(Number(selectedDeptId));
        setSubDepartmentOptions(subs);
        // Only reset if the current subDept doesn't exist in new options
        if (!subs.some((sub) => sub.label === formData.subdepartment)) {
          setFormData((prev) => ({ ...prev, subdepartment: '' }));
        }
      }
    } else {
      setSubDepartmentOptions([]);
      if (formData.subdepartment) {
        // Only reset if there's a value
        setFormData((prev) => ({ ...prev, subdepartment: '' }));
      }
    }
  }, [formData.department, departmentOptions]);

  // Handle toast messages when documents are loaded
  useEffect(() => {
    if (!loadingDocuments && formData.isLoaded) {
      if (unrecordedDocuments.length > 0) {
        toast.success(`Found ${unrecordedDocuments.length} document(s)`);
      } else {
        toast('No documents found for the selected criteria', {
          icon: 'ℹ️',
          style: {
            background: '#3B82F6',
            color: '#fff',
          },
        });
      }
    }
  }, [loadingDocuments, formData.isLoaded, unrecordedDocuments.length]);

  const handleOCR = async () => {
    const selectedDocument = unrecordedDocuments.find(
      (doc) => doc.FileName === formData.selectedDoc?.FileName
    );
    const selectedTemplateName = templateOptions.find(
      (temp) => temp.value === formData.template
    )?.label;

    if (!selectedDocument) {
      toast.error('Please select a document to process');
      return;
    }

    if (!selectedTemplateName) {
      toast.error('Please select a template for OCR processing');
      return;
    }

    if (!selectedRole?.ID) {
      toast.error('User role not found. Please refresh and try again.');
      return;
    }

    setProcessingState(prev => ({ ...prev, isProcessingOCR: true }));

    const payload = {
      templateName: selectedTemplateName,
      userId: Number(selectedRole.ID),
      linkId: selectedDocument.LinkID,
    };

    try {
      const res = await runOCR(selectedDocument.ID, payload);
      console.log(res, 'runOCR');
      
      // Log OCR processing activity
      try {
        await logOCRActivity(
          'OCR_PROCESSED',
          selectedRole.ID,
          user?.UserName || 'Unknown',
          selectedDocument.ID,
          selectedDocument.FileName,
          selectedTemplateName,
          true
        );
      } catch (logError) {
        console.warn('Failed to log OCR activity:', logError);
      }
      
      setFormData({ ...formData, selectedDoc: null });
      fetchUnrecorded(
        formData.department,
        formData.subdepartment,
        String(selectedRole.ID)
      );

      toast.success(`OCR processing started for "${selectedDocument.FileName}"`);
    } catch (error: any) {
      console.error('OCR processing failed:', error);
      
      // Log OCR failure activity
      try {
        await logOCRActivity(
          'OCR_FAILED',
          selectedRole.ID,
          user?.UserName || 'Unknown',
          selectedDocument.ID,
          selectedDocument.FileName,
          selectedTemplateName,
          false
        );
      } catch (logError) {
        console.warn('Failed to log OCR failure activity:', logError);
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred';
      toast.error(`Failed to start OCR: ${errorMessage}`);
    } finally {
      setProcessingState(prev => ({ ...prev, isProcessingOCR: false }));
    }
  };

  const handleLoad = async () => {
    if (!selectedRole?.ID) {
      toast.error('Please select a role');
      return;
    }

    if (!formData.department || !formData.subdepartment || !formData.template) {
      toast.error('Please select department, document type, and template');
      return;
    }

    setFormData({ ...formData, isLoaded: false });
    
    try {
      await fetchUnrecorded(
        formData.department,
        formData.subdepartment,
        String(selectedRole.ID)
      );
      
      setFormData((prev) => ({
        ...prev,
        lastFetchedValues: {
          department: prev.department,
          subdepartment: prev.subdepartment,
          template: prev.template,
        },
      }));
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load documents';
      toast.error(`Failed to load documents: ${errorMessage}`);
    } finally {
      setFormData({ ...formData, isLoaded: true });
    }
  };

  const handleDocSelection = (doc: UnrecordedDocument) => {
    setFormData({
      ...formData,
      selectedDoc: doc,
    });
  };

  const handlePreviewDoc = async () => {
    if (!formData.selectedDoc) {
      toast.error('Please select a document to preview');
      return;
    }
    
    setProcessingState(prev => ({ ...prev, isPreviewing: true }));
    
    try {
      const res = await fetchDocument(formData.selectedDoc.ID.toString());
      console.log(res, 'handlePreviewDoc');
      setCurrentUnrecordedDocument(res);
      toast.success('Document preview loaded');
    } catch (error: any) {
      console.error('Failed to preview document:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load document preview';
      toast.error(`Failed to preview document: ${errorMessage}`);
    } finally {
      setProcessingState(prev => ({ ...prev, isPreviewing: false }));
    }
  };

  const isSameAsLastFetch =
    formData.department === formData.lastFetchedValues?.department &&
    formData.subdepartment === formData.lastFetchedValues?.subdepartment &&
    formData.template === formData.lastFetchedValues?.template;

  if (loadingDepartments) {
    return <div>Loading departments...</div>;
  }

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg">
      {/* HEADER */}
      <header className="text-left flex-1 py-4 px-3 sm:px-6">
        <h1 className="text-3xl font-bold text-blue-800">
          Masking Setup
        </h1>
        <p className="mt-2 text-gray-600">
          Manage masking templates to documents for restrictions.
        </p>
      </header>

      <div className="flex gap-4 p-2 sm:p-4 w-full max-lg:flex-col">
        {/* Left Panel - Document List */}
        <div className="w-full lg:w-1/2 p-2 sm:p-6 space-y-6 border-r bg-white">
          <div className="flex gap-4 flex-col">
            <Select
              label="Department"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              placeholder="Select a Department"
              options={departmentOptions}
            />

            <Select
              label="Document Type"
              value={formData.subdepartment}
              onChange={(e) =>
                setFormData({ ...formData, subdepartment: e.target.value })
              }
              placeholder={
                !formData.department
                  ? 'Select a Department First'
                  : subDepartmentOptions.length === 0
                  ? 'No Document Types Available'
                  : 'Select a Document Type'
              }
              options={subDepartmentOptions}
              disabled={!formData.department}
            />

            <Select
              label="OCR Template"
              value={formData.template}
              onChange={(e) =>
                setFormData({ ...formData, template: e.target.value })
              }
              placeholder="Select a Template"
              options={templateOptions}
            />

            {unrecordedPermissions?.Add && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleLoad}
                disabled={
                  !formData.department ||
                  !formData.subdepartment ||
                  !formData.template ||
                  isSameAsLastFetch ||
                  loadingDocuments
                }
              >
                {loadingDocuments ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading Documents...
                  </>
                ) : (
                  'Get Documents'
                )}
              </Button>
            )}
          </div>

          {/* Search Bar */}
          {unrecordedDocuments.length > 0 && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search documents..."
                value={processingState.searchTerm}
                onChange={(e) => setProcessingState(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {processingState.searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    onClick={() => setProcessingState(prev => ({ ...prev, searchTerm: '' }))}
                    className="text-gray-400 hover:text-gray-600"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Document List */}
          {filteredDocuments.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.ID}
                  onClick={() => handleDocSelection(doc)}
                  className={`cursor-pointer p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    formData.selectedDoc?.FileName === doc.FileName
                      ? 'bg-blue-50 border-blue-300 shadow-md'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.FileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {doc.ID}
                      </p>
                    </div>
                    {formData.selectedDoc?.FileName === doc.FileName && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Documents Message */}
          {unrecordedDocuments.length === 0 && formData.isLoaded && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                No Documents Found
              </h3>
              <p className="text-sm text-gray-400">
                Try adjusting your search criteria or check back later
              </p>
            </div>
          )}

          {/* Search Results Message */}
          {unrecordedDocuments.length > 0 && filteredDocuments.length === 0 && processingState.searchTerm && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                No Documents Match Your Search
              </h3>
              <p className="text-sm text-gray-400">
                Try adjusting your search terms
              </p>
            </div>
          )}

          {formData.selectedDoc && (
            <div className="flex gap-4 max-sm:flex-col w-full flex-1">
              <Button
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePreviewDoc}
                disabled={!formData.selectedDoc || processingState.isPreviewing}
              >
                {processingState.isPreviewing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Doc
                  </>
                )}
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleOCR}
                disabled={!formData.selectedDoc || processingState.isProcessingOCR}
              >
                {processingState.isProcessingOCR ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start OCR
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right Panel - Document Preview */}
        <div className="w-full lg:w-1/2 p-2 sm:p-4 bg-white">
          {formData.selectedDoc ? (
            currentUnrecoredDocument?.document[0]?.filepath ? (
              <div className="w-full max-h-[60vh] overflow-auto border rounded-md bg-gray-50">
                <div className="relative">
                  <img
                    ref={imgRef}
                    src={currentUnrecoredDocument?.document[0]?.filepath || ''}
                    alt="Document Preview"
                    className="block w-full h-auto"
                    draggable={false}
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {formData.selectedDoc.FileName}
                  </div>
                </div>
              </div>
            ) : processingState.isPreviewing ? (
              <div className="flex flex-col items-center justify-center h-64 border rounded-md bg-gray-50">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading document preview...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 border rounded-md bg-gray-50">
                <Eye className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Document selected</p>
                <p className="text-sm text-gray-500">Click "Preview Doc" to view</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border rounded-md bg-gray-50">
              <FileText className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No document selected</p>
              <p className="text-sm text-gray-500">Select a document from the list to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRUnrecordedUI;
