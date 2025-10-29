import { CurrentDocument } from '@/types/Document';
import Modal from '../ui/Modal';
import {
  Clock,
  Eye,
  FileText,
  Shield,
  Building,
  Calendar,
  Info,
  Download,
} from 'lucide-react';
import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import { useState, useEffect } from 'react';
import { logDocumentActivity } from '@/utils/activityLogger';
import { useDocument } from '@/contexts/DocumentContext';
import { useAuth } from '@/contexts/AuthContext';
import axios from '@/api/axios';

interface Field {
  LinkID: number;
  FieldNumber: number;
  Active: number;
  Description: string;
  DataType: string;
}

const DocumentCurrentView = ({
  document,
}: {
  document: CurrentDocument | null;
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const { user } = useAuth();
  const { fetchDocument } = useDocument();

  const currentDocumentInfo = document?.document[0];


  // Fetch fields based on SubDepartmentId (LinkID)
  useEffect(() => {
    const fetchFields = async () => {
      if (!currentDocumentInfo?.SubDepartmentId) {
        setFields([]);
        return;
      }

      setFieldsLoading(true);
      try {
        const response = await axios.get(
          `/fields/by-link/${currentDocumentInfo.SubDepartmentId}`
        );
        
        const activeFields = response.data.data.filter(
          (field: Field) => field.Active === 1
        );
        
        // If API returns empty, check if we have document data to display
        if (activeFields.length === 0) {
          // Create a temporary display for any fields that have values
          const tempFields: Field[] = [];
          
          // Check Text fields (1-10)
          for (let i = 1; i <= 10; i++) {
            const textKey = `Text${i}` as keyof typeof currentDocumentInfo;
            const textValue = currentDocumentInfo?.[textKey];
            if (textValue && textValue !== null && textValue !== '') {
              tempFields.push({
                LinkID: currentDocumentInfo?.SubDepartmentId || 0,
                FieldNumber: i,
                Active: 1,
                Description: `Field ${i}`,
                DataType: 'Text'
              });
            }
          }
          
          // Check Date fields (1-10)
          for (let i = 1; i <= 10; i++) {
            const dateKey = `Date${i}` as keyof typeof currentDocumentInfo;
            const dateValue = currentDocumentInfo?.[dateKey];
            if (dateValue && dateValue !== null && dateValue !== '') {
              tempFields.push({
                LinkID: currentDocumentInfo?.SubDepartmentId || 0,
                FieldNumber: i,
                Active: 1,
                Description: `Field ${i}`,
                DataType: 'Date'
              });
            }
          }
          
          // Sort fields by FieldNumber to ensure correct order
          tempFields.sort((a, b) => a.FieldNumber - b.FieldNumber);
          
          setFields(tempFields);
        } else {
          setFields(activeFields);
        }
      } catch (error) {
        console.error('Failed to fetch fields:', error);
        setFields([]);
      } finally {
        setFieldsLoading(false);
      }
    };

    fetchFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDocumentInfo?.SubDepartmentId]);

  const documentsDepartment = departmentOptions.find(
    (department) =>
      department.value === String(currentDocumentInfo?.DepartmentId)
  );
  const documentsSubDepartment = subDepartmentOptions.find(
    (subDepartment) =>
      subDepartment.value === String(currentDocumentInfo?.SubDepartmentId)
  );

  // Get field values from the document
  const getFieldValue = (fieldNumber: number, dataType: string): string => {
    const doc = currentDocumentInfo;
    if (!doc) {
      return '';
    }

    if (dataType === 'Text') {
      const textField = doc[`Text${fieldNumber}` as keyof typeof doc];
      return textField ? String(textField) : '';
    } else if (dataType === 'Date') {
      const dateField = doc[`Date${fieldNumber}` as keyof typeof doc];
      return dateField ? String(dateField) : '';
    }
    return '';
  };

  const formatDateValue = (dateValue: string) => {
    if (!dateValue) return '';
    try {
      return new Date(dateValue).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateValue;
    }
  };

  const handleDownload = async () => {
    if (currentDocumentInfo?.filepath) {
      try {
        const response = await fetch(currentDocumentInfo.filepath);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = window.document.createElement('a');
        link.href = url;
        link.download = currentDocumentInfo?.FileName || 'document';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);
        
        // Log document download activity
        try {
          // console.log('🔍 Logging download activity for document:', currentDocumentInfo.ID);
          await logDocumentActivity(
            'DOWNLOADED',
            user!.ID,
            user!.UserName,
            currentDocumentInfo.ID,
            currentDocumentInfo.FileName,
            `Downloaded by ${user!.UserName}`
          );
          console.log('✅ Download activity logged successfully');
          
          // Refresh document data to show the new audit trail entry
          if (document?.document?.[0]?.ID) {
            console.log('🔄 Refreshing document data...');
            await fetchDocument(String(document.document[0].ID));
            console.log('✅ Document data refreshed');
          }
        } catch (logError) {
          console.warn('Failed to log document download activity:', logError);
        }
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };
  
  if (!document || !currentDocumentInfo) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {isViewerOpen && currentDocumentInfo?.filepath ? (
        <Modal isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)}>
          <img src={currentDocumentInfo?.filepath || ''} alt="" />
        </Modal>
      ) : (
        <>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-1">
                      Version {document?.versions[0].VersionNumber}
                    </span>
                    <h1 className="text-xl font-semibold text-gray-900">
                      {currentDocumentInfo?.FileName}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Last modified:{' '}
                    {document?.versions[0].ModificationDate
                      ? new Date(
                          document?.versions[0]?.ModificationDate
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsViewerOpen(true)}
                  disabled={!currentDocumentInfo?.filepath}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!currentDocumentInfo?.filepath}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          </div>

          {/* Document Information */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Document Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Format */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700">
                    File Format
                  </h4>
                </div>
                <p className="text-gray-900 font-medium">
                  {currentDocumentInfo?.DataType || 'N/A'}
                </p>
              </div>
              
              {/* Confidential Status */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      currentDocumentInfo?.Confidential
                        ? 'bg-gradient-to-r from-red-500 to-pink-500'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}
                  >
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Confidential
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentDocumentInfo?.Confidential
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {currentDocumentInfo?.Confidential ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* Department */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Building className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Department
                  </h4>
                </div>
                <p className="text-gray-900 font-medium">
                  {documentsDepartment?.label || 'N/A'}
                </p>
              </div>

              {/* Document Type */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Building className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Document Type
                  </h4>
                </div>
                <p className="text-gray-900 font-medium">
                  {documentsSubDepartment?.label || 'N/A'}
                </p>
              </div>

              {/* File Date */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700">
                    File Date
                  </h4>
                </div>
                <p className="text-gray-900 font-medium">
                  {currentDocumentInfo?.FileDate
                    ? new Date(currentDocumentInfo.FileDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )
                    : 'N/A'}
                </p>
              </div>

              {/* File Description - Full Width */}
               <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700">
                    File Description
                  </h4>
                </div>
                <p className="text-gray-900 font-medium">
                  {currentDocumentInfo?.FileDescription ||
                    'No description available'}
                </p>
              </div>

              {/* Fields - All in one box */}
              <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-yellow-500 to-gray-500 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Fields
                  </h3>
                </div>
                
                {fieldsLoading ? (
                  <div className="py-4">
                    <p className="text-gray-500 text-sm">Loading fields...</p>
                  </div>
                ) : fields.length > 0 ? (
                  <div className="space-y-4">
                    {fields.map((field) => {
                      const fieldValue = getFieldValue(field.FieldNumber, field.DataType);
                      // console.log('🔍 Rendering field:', field.Description, 'Value:', fieldValue);
                      return (
                        <div
                          key={`${field.LinkID}-${field.FieldNumber}`}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-gray-700">
                                  {field.Description}
                                </h4>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  {field.DataType}
                                </span>
                              </div>
                              <p className="text-gray-900 font-medium">
                                {field.DataType === 'Date'
                                  ? formatDateValue(fieldValue)
                                  : fieldValue || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="text-gray-500 text-sm">No fields available</p>
                  </div>
                )}
              </div>

              {/* End of Lists here */}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentCurrentView;