import { Select } from '@/components/ui/Select';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { Button } from '@chakra-ui/react';
import { useRef, useState, useEffect } from 'react';
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
  const { selectedRole } = useAuth();
  const { unrecordedDocuments, fetchUnrecorded } = useUnrecordedDocuments();
  const [currentUnrecoredDocument, setCurrentUnrecordedDocument] =
    useState<CurrentDocument | null>(null);
  const { loading, fetchDocument } = useDocument();
  const unrecordedPermissions = useModulePermissions(9); // 1 = MODULE_ID
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

  const handleOCR = async () => {
    const selectedDocument = unrecordedDocuments.find(
      (doc) => doc.FileName === formData.selectedDoc?.FileName
    );
    const selectedTemplateName = templateOptions.find(
      (temp) => temp.value === formData.template
    )?.label;

    if (!selectedDocument) {
      toast.error('No document selected');
      return;
    }

    const payload = {
      templateName: selectedTemplateName,
      userId: Number(selectedRole?.ID),
      linkId: selectedDocument.LinkID,
    };

    try {
      const res = await runOCR(selectedDocument.ID, payload);
      console.log(res, 'runOCR');
      setFormData({ ...formData, selectedDoc: null });
      fetchUnrecorded(
        formData.department,
        formData.subdepartment,
        String(selectedRole?.ID)
      );

      toast.success('OCR processing started successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to start OCR');
    }
  };

  const handleLoad = async () => {
    if (!selectedRole?.ID) {
      toast.error('Please select a role');
      return;
    }
    setFormData({ ...formData, isLoaded: false });
    try {
      fetchUnrecorded(
        formData.department,
        formData.subdepartment,
        String(selectedRole?.ID)
      );
      setFormData((prev) => ({
        ...prev,
        lastFetchedValues: {
          department: prev.department,
          subdepartment: prev.subdepartment,
          template: prev.template,
        },
      }));
      unrecordedDocuments.length > 0 &&
        toast.success('Documents loaded successfully');
    } catch (error) {
      console.log(error);
      toast.error('Failed to load document');
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
    if (!formData.selectedDoc) return;
    try {
      const res = await fetchDocument(formData.selectedDoc.ID.toString());
      console.log(res, 'handlePreviewDoc');
      setCurrentUnrecordedDocument(res);
    } catch (error) {
      console.error(error);
      toast.error('Failed to start OCR');
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
          Unrecorded Documents
        </h1>
        <p className="mt-2 text-gray-600">
          Manage all unrecorded documents here
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
              label="Sub-Department"
              value={formData.subdepartment}
              onChange={(e) =>
                setFormData({ ...formData, subdepartment: e.target.value })
              }
              placeholder={
                !formData.department
                  ? 'Select a Department First'
                  : subDepartmentOptions.length === 0
                  ? 'No Sub-Departments Available'
                  : 'Select a Sub-Department'
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm w-full"
                onClick={handleLoad}
                disabled={
                  !formData.department ||
                  !formData.subdepartment ||
                  !formData.template ||
                  isSameAsLastFetch
                }
              >
                Get Documents
              </Button>
            )}
          </div>

          {unrecordedDocuments.length > 0 &&
            unrecordedDocuments?.map((doc) => (
              <div
                key={doc.ID}
                onClick={() => handleDocSelection(doc)}
                className={`cursor-pointer text-sm px-2 py-1 rounded hover:bg-blue-100 ${
                  formData.selectedDoc?.FileName === doc.FileName
                    ? 'bg-blue-200'
                    : ''
                }`}
              >
                {doc.FileName}
              </div>
            ))}

          {unrecordedDocuments.length === 0 && formData.isLoaded && (
            <div className="text-xl text-center px-2 py-1  ">
              No Documents Found
            </div>
          )}

          {formData.selectedDoc && (
            <div className="flex gap-4 max-sm:flex-col w-full flex-1">
              <Button
                className="bg-gray-100 hover:bg-gray-200  px-4 py-2 rounded text-sm flex-1 "
                onClick={handlePreviewDoc}
                disabled={!formData.selectedDoc || loading}
              >
                {loading ? 'Loading...' : 'Preview Doc'}
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex-1 "
                onClick={handleOCR}
                disabled={!formData.selectedDoc}
              >
                Start OCR
              </Button>
            </div>
          )}
        </div>

        {/* Right Panel - Document Preview */}
        <div className="w-full lg:w-1/2 p-2 sm:p-4 bg-white">
          {currentUnrecoredDocument?.document[0]?.filepath &&
          formData.selectedDoc ? (
            <div className="w-full max-h-[60vh] overflow-auto border rounded-md">
              <div
                className="relative"
                style={{ width: '100%', minWidth: '100%', height: '100%' }}
              >
                <img
                  ref={imgRef}
                  src={currentUnrecoredDocument?.document[0]?.filepath || ''}
                  alt="Document Preview"
                  className="block"
                  style={{
                    width: '100%',
                    height: '100%',
                    minWidth: '100%',
                  }}
                  draggable={false}
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center">
              Load document to preview
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRUnrecordedUI;
