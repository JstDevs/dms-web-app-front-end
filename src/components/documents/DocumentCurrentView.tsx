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
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 relative group">
            <div className="relative">
              <Info className="h-5 w-5 text-blue-500 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
              <div className="absolute -inset-1 rounded-full bg-blue-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              Document Information
            </span>
          </h3>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Format */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-inner">
                  <FileText className="h-5 w-5 text-white drop-shadow-sm" />
                </div>
                <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                  File Format
                </h4>
              </div>

              <p
                className={`text-gray-900 font-medium leading-relaxed bg-gray-50 border border-gray-100 px-4 py-2 rounded-lg ${
                  currentDocumentInfo?.DataType ? 'text-gray-900' : 'text-gray-500 italic'
                }`}
              >
                {currentDocumentInfo?.DataType || 'N/A'}
              </p>
            </div>

              
              {/* Confidential Status */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-inner transition-all duration-300 ${
                    currentDocumentInfo?.Confidential
                      ? 'bg-gradient-to-r from-red-500 to-pink-500'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500'
                  }`}
                >
                  <Shield className="h-5 w-5 text-white drop-shadow-sm" />
                </div>
                <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                  Confidential
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-300 ${
                    currentDocumentInfo?.Confidential
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-green-100 text-green-800 border border-green-200'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full mr-2 ${
                      currentDocumentInfo?.Confidential ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  ></span>
                  {currentDocumentInfo?.Confidential ? 'Yes, Confidential' : 'No, Public'}
                </span>
              </div>
            </div>



              {/* Department */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-inner">
                  <Building className="h-5 w-5 text-white drop-shadow-sm" />
                </div>
                <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                  Department
                </h4>
              </div>

              <p
                className={`text-gray-900 font-medium leading-relaxed bg-gray-50 border border-gray-100 px-4 py-2 rounded-lg ${
                  documentsDepartment?.label ? 'text-gray-900' : 'text-gray-500 italic'
                }`}
              >
                {documentsDepartment?.label || 'N/A'}
              </p>
            </div>


              {/* Document Type */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-inner">
                  <Building className="h-5 w-5 text-white drop-shadow-sm" />
                </div>
                <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                  Document Type
                </h4>
              </div>

              <p
                className={`text-gray-900 font-medium leading-relaxed bg-gray-50 border border-gray-100 px-4 py-2 rounded-lg ${
                  documentsSubDepartment?.label ? 'text-gray-900' : 'text-gray-500 italic'
                }`}
              >
                {documentsSubDepartment?.label || 'N/A'}
              </p>
            </div>

              {/* File Date */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-400 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-inner">
                    <Calendar className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                    File Date
                  </h4>
                </div>
                <p
                  className={`text-gray-900 font-medium leading-relaxed bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg ${
                    currentDocumentInfo?.FileDate ? 'text-gray-900' : 'text-gray-500 italic'
                  }`}
                >
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
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-teal-400 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 flex items-center justify-center shadow-inner">
                    <FileText className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                    File Description
                  </h4>
                </div>

                <p
                  className={`text-gray-900 font-medium leading-relaxed bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg ${
                    currentDocumentInfo?.FileDescription
                      ? 'text-gray-900'
                      : 'text-gray-500 italic'
                  }`}
                >
                  {currentDocumentInfo?.FileDescription || 'No description available'}
                </p>
              </div>

              {/* Fields - All in one box */}
              <div className="md:col-span-2 bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur">
                <div className="flex items-center gap-3 mb-5 border-b border-gray-200 pb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-yellow-500 to-gray-600 flex items-center justify-center shadow-inner">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 tracking-wide">
                    Fields
                  </h3>
                </div>

                {fieldsLoading ? (
                  <div className="py-6 text-center">
                    <div className="animate-pulse text-gray-500 text-sm">Loading fields...</div>
                  </div>
                ) : fields.length > 0 ? (
                  <div className="space-y-4">
                    {fields.map((field) => {
                      const fieldValue = getFieldValue(field.FieldNumber, field.DataType);

                      return (
                        <div
                          key={`${field.LinkID}-${field.FieldNumber}`}
                          className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-yellow-400 transition-all duration-300"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-semibold text-gray-800 group-hover:text-yellow-600 transition-colors">
                                  {field.Description}
                                </h4>
                                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                  {field.DataType}
                                </span>
                              </div>
                              <p className="text-gray-900 font-medium bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg">
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
                  <div className="py-6 text-center text-gray-500 text-sm">
                    No fields available
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