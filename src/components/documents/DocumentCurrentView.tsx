import { CurrentDocument } from '@/types/Document';
import { Restriction } from '@/types/Restriction';
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
  MessageSquare,
  Loader2,
  PencilLine,
  Save,
  XCircle,
} from 'lucide-react';
import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import { useState, useEffect, useCallback } from 'react';
import { logDocumentActivity } from '@/utils/activityLogger';
import { useDocument } from '@/contexts/DocumentContext';
import { useAuth } from '@/contexts/AuthContext';
import axios from '@/api/axios';
import { toast } from 'react-hot-toast';
import { editDocument } from '@/pages/Document/utils/uploadAPIs';
import { buildDocumentFormData, type DocumentUploadProp } from '@/pages/Document/utils/documentHelpers';
import { convertPdfToPdfA } from '@/utils/pdfConverter';
import { fetchDocumentRestrictions } from './Restriction/Restriction';
import MaskedDocumentViewer from './MaskedDocumentViewer';

interface Field {
  LinkID: number;
  FieldNumber: number;
  Active: number;
  Description: string;
  DataType: string;
}

interface DocumentCurrentViewProps {
  document: CurrentDocument | null;
  permissions?: {
    View?: boolean;
    Add?: boolean;
    Edit?: boolean;
    Delete?: boolean;
    Print?: boolean;
    Confidential?: boolean;
    Comment?: boolean;
    Collaborate?: boolean;
    Finalize?: boolean;
    Masking?: boolean;
  };
}

type FormValues = {
  FileName: string;
  FileDescription: string;
  Description: string;
  Remarks: string;
  DepartmentId: string;
  SubDepartmentId: string;
  FileDate: string;
  Confidential: boolean;
  Expiration: boolean;
  ExpirationDate: string;
};

const normalizeDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

/**
 * Robust date-time formatter that handles potential timezone issues
 * Ensures consistency across different browser environments
 */
const safeDateTimeFormat = (dateValue: string | null | undefined) => {
  if (!dateValue) return '—';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (err) {
    console.warn('Error formatting date:', err);
    return '—';
  }
};

// Normalize filepath URL to use correct base URL (fixes localhost issue when accessing from different machines)
const normalizeFilepathUrl = (filepath: string | null | undefined): string => {
  if (!filepath) return '';

  // If already a full URL, check if it's localhost and replace with API base URL
  if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
    // Check if it contains localhost
    if (filepath.includes('localhost') || filepath.includes('127.0.0.1')) {
      // Extract the path from the URL
      const url = new URL(filepath);
      const path = url.pathname + url.search + url.hash;
      // Use API base URL instead
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      return `${apiBaseUrl}${path}`;
    }
    // Already a valid full URL, return as is
    return filepath;
  }

  // If it's a relative path, prepend API base URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  // Ensure path starts with /
  const normalizedPath = filepath.startsWith('/') ? filepath : `/${filepath}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

const DocumentCurrentView = ({
  document,
  permissions,
}: DocumentCurrentViewProps) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewerRestrictions, setViewerRestrictions] = useState<Restriction[]>([]);
  const [restrictionsLoading, setRestrictionsLoading] = useState(false);
  const [restrictionsError, setRestrictionsError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({
    FileName: '',
    FileDescription: '',
    Description: '',
    Remarks: '',
    DepartmentId: '',
    SubDepartmentId: '',
    FileDate: '',
    Confidential: false,
    Expiration: false,
    ExpirationDate: '',
  });
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, string>>({});
  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const { user, selectedRole } = useAuth();
  const { fetchDocument } = useDocument();

  const currentDocumentInfo = document?.document[0];

  // Get current version's filepath if available (prioritize over document[0].filepath)
  // This ensures we always show the latest version's file
  const currentVersion = document?.versions?.find(v => v.IsCurrentVersion) || document?.versions?.[0];
  const effectiveFilepath = currentVersion?.filepath || currentDocumentInfo?.filepath;

  useEffect(() => {
    const loadViewerRestrictions = async () => {
      if (!currentDocumentInfo?.ID) {
        setViewerRestrictions([]);
        setRestrictionsError(null);
        return;
      }

      if (!selectedRole?.ID && !user?.ID) {
        setViewerRestrictions([]);
        setRestrictionsError(null);
        return;
      }

      setRestrictionsLoading(true);
      setRestrictionsError(null);

      try {
        const response = await fetchDocumentRestrictions(
          String(currentDocumentInfo.ID)
        );

        if (response.success && response.data) {
          const normalizedRestrictions: Restriction[] = response.data.map(
            (restriction: any) => {
              const rawType =
                restriction?.restrictedType ??
                restriction?.RestrictedType ??
                restriction?.Field;
              const normalizedTypeString =
                typeof rawType === 'string'
                  ? rawType.toLowerCase()
                  : String(rawType ?? '').toLowerCase();

              const normalizedType: 'field' | 'open' =
                normalizedTypeString === 'open' ||
                  normalizedTypeString === 'custom area'
                  ? 'open'
                  : 'field';

              return {
                ...restriction,
                restrictedType: normalizedType,
              } as Restriction;
            }
          );

          const roleId = selectedRole?.ID ? Number(selectedRole.ID) : null;
          const userId = user?.ID ?? null;

          const filtered = normalizedRestrictions.filter((restriction) => {
            const restrictionRoleId =
              restriction.UserRole !== undefined &&
                restriction.UserRole !== null &&
                String(restriction.UserRole) !== ''
                ? Number(restriction.UserRole)
                : null;
            const restrictionUserId =
              restriction.UserID !== undefined &&
                restriction.UserID !== null &&
                String(restriction.UserID) !== ''
                ? Number(restriction.UserID)
                : null;

            const matchesRole =
              roleId !== null &&
              restrictionRoleId !== null &&
              restrictionRoleId === roleId;
            const matchesUser =
              userId !== null &&
              restrictionUserId !== null &&
              restrictionUserId === userId;

            return matchesRole || matchesUser;
          });

          setViewerRestrictions(filtered);
        } else if (response.statusCode === 404) {
          setViewerRestrictions([]);
          setRestrictionsError(null);
        } else {
          setViewerRestrictions([]);
          setRestrictionsError(
            response.message ||
            'No masking details available for this document.'
          );
        }
      } catch (error) {
        console.error('Failed to load masking restrictions for viewer:', error);
        setViewerRestrictions([]);
        setRestrictionsError(
          'Failed to load masking details. Please try again later.'
        );
      } finally {
        setRestrictionsLoading(false);
      }
    };

    loadViewerRestrictions();
  }, [currentDocumentInfo?.ID, selectedRole?.ID, user?.ID]);

  const initializeForm = useCallback(() => {
    if (!currentDocumentInfo) return;

    setFormValues({
      FileName: currentDocumentInfo.FileName || '',
      FileDescription: currentDocumentInfo.FileDescription || '',
      Description: currentDocumentInfo.Description || '',
      Remarks: currentDocumentInfo.Remarks || '',
      DepartmentId: currentDocumentInfo.DepartmentId
        ? String(currentDocumentInfo.DepartmentId)
        : '',
      SubDepartmentId: currentDocumentInfo.SubDepartmentId
        ? String(currentDocumentInfo.SubDepartmentId)
        : '',
      FileDate: normalizeDateInput(currentDocumentInfo.FileDate),
      Confidential: Boolean(currentDocumentInfo.Confidential),
      Expiration: Boolean(currentDocumentInfo.Expiration),
      ExpirationDate: normalizeDateInput(currentDocumentInfo.ExpirationDate),
    });

    const initialFieldValues: Record<string, string> = {};
    for (let i = 1; i <= 10; i += 1) {
      const textKey = `Text${i}` as keyof typeof currentDocumentInfo;
      const dateKey = `Date${i}` as keyof typeof currentDocumentInfo;

      const textValue = currentDocumentInfo[textKey];
      const dateValue = currentDocumentInfo[dateKey];

      if (textValue !== null && textValue !== undefined) {
        initialFieldValues[`Text${i}`] = String(textValue);
      } else {
        initialFieldValues[`Text${i}`] = '';
      }

      if (dateValue) {
        initialFieldValues[`Date${i}`] = normalizeDateInput(String(dateValue));
      } else {
        initialFieldValues[`Date${i}`] = '';
      }
    }

    setDynamicFieldValues(initialFieldValues);
  }, [currentDocumentInfo]);

  useEffect(() => {
    initializeForm();
  }, [initializeForm]);

  useEffect(() => {
    if (!currentDocumentInfo || fields.length === 0) return;

    setDynamicFieldValues((prev) => {
      const updated = { ...prev };
      fields.forEach((field) => {
        const key = `${field.DataType === 'Date' ? 'Date' : 'Text'}${field.FieldNumber}`;
        if (!(key in updated)) {
          const rawValue = currentDocumentInfo[key as keyof typeof currentDocumentInfo];
          updated[key] = rawValue
            ? field.DataType === 'Date'
              ? normalizeDateInput(String(rawValue))
              : String(rawValue)
            : '';
        }
      });
      return updated;
    });
  }, [fields, currentDocumentInfo]);

  const handleFormValueChange = (field: keyof FormValues, value: string | boolean) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDepartmentChange = (value: string) => {
    setFormValues((prev) => ({
      ...prev,
      DepartmentId: value,
      SubDepartmentId: '',
    }));
  };

  const handleDynamicFieldChange = (key: string, value: string) => {
    setDynamicFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleStartEditing = () => {
    initializeForm();
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    initializeForm();
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!currentDocumentInfo) return;

    if (!formValues.FileName.trim()) {
      toast.error('File name is required.');
      return;
    }

    if (!formValues.DepartmentId || !formValues.SubDepartmentId) {
      toast.error('Department and document type are required.');
      return;
    }

    if (!formValues.FileDate) {
      toast.error('File date is required.');
      return;
    }

    if (formValues.Expiration && !formValues.ExpirationDate) {
      toast.error('Please choose an expiration date or disable expiration.');
      return;
    }

    setIsSaving(true);

    const updatedDoc: Partial<DocumentUploadProp> = {
      ID: currentDocumentInfo.ID,
      FileName: formValues.FileName.trim(),
      FileDescription: formValues.FileDescription,
      Description: formValues.Description,
      Remarks: formValues.Remarks,
      DepartmentId: Number(formValues.DepartmentId),
      SubDepartmentId: Number(formValues.SubDepartmentId),
      FileDate: formValues.FileDate,
      Confidential: formValues.Confidential,
      Expiration: formValues.Expiration,
      ExpirationDate: formValues.Expiration ? formValues.ExpirationDate : '',
      Active: currentDocumentInfo.Active,
      publishing_status: currentDocumentInfo.publishing_status,
    };

    for (let i = 1; i <= 10; i += 1) {
      const textKey = `Text${i}` as keyof DocumentUploadProp;
      const dateKey = `Date${i}` as keyof DocumentUploadProp;

      if (dynamicFieldValues[`Text${i}`] !== undefined) {
        (updatedDoc as any)[textKey] = dynamicFieldValues[`Text${i}`];
      }

      if (dynamicFieldValues[`Date${i}`] !== undefined) {
        (updatedDoc as any)[dateKey] = dynamicFieldValues[`Date${i}`];
      }
    }

    try {
      // Metadata edits create minor versions (v1 → v1.1, v2 → v2.1, etc.)
      const formData = buildDocumentFormData(
        updatedDoc,
        null,
        false,
        currentDocumentInfo.ID,
        undefined,
        true,   // isMinorVersion: true - metadata edits create minor versions
        false   // finalize: false
      );

      // Ensure editable fields overwrite existing values even when empty
      formData.set('filename', formValues.FileName.trim());
      formData.set('FileDescription', formValues.FileDescription || '');
      formData.set('Description', formValues.Description || '');
      formData.set('remarks', formValues.Remarks || '');
      formData.set('filedate', formValues.FileDate || '');
      formData.set('dep', formValues.DepartmentId);
      formData.set('subdep', formValues.SubDepartmentId);
      formData.set('confidential', String(formValues.Confidential));
      formData.set('expiration', String(formValues.Expiration));
      formData.set('expdate', formValues.Expiration ? formValues.ExpirationDate : '');

      for (let i = 1; i <= 10; i += 1) {
        formData.set(`Text${i}`, dynamicFieldValues[`Text${i}`] ?? '');
        formData.set(`Date${i}`, dynamicFieldValues[`Date${i}`] ?? '');
      }


      const response = await editDocument(formData);

      if (response?.status === false) {
        throw new Error(response?.message || 'Failed to update document');
      }

      try {
        if (user) {
          await logDocumentActivity(
            'UPDATED',
            user.ID,
            user.UserName,
            currentDocumentInfo.ID,
            formValues.FileName,
            `Updated by ${user.UserName}`
          );
        }
      } catch (logError) {
        console.warn('Failed to log document update activity:', logError);
      }

      // Refresh document to get updated version
      await fetchDocument(String(currentDocumentInfo.ID));

      toast.success('Document updated successfully.');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update document:', error);
      toast.error(error?.message || 'Failed to update document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


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

        const fieldsData: Field[] = Array.isArray(response?.data?.data)
          ? response.data.data
          : [];

        // Normalize Active flag in case API sends strings/booleans
        const activeFields = fieldsData.filter((field: Field) => {
          const activeValue = (field as unknown as { Active: unknown }).Active;
          return activeValue === 1 || activeValue === '1' || activeValue === true || activeValue === 'true';
        });

        // Only use fallback when there are truly no configured fields at all
        if (fieldsData.length === 0) {
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
    if (effectiveFilepath) {
      try {
        // Normalize filepath to use correct base URL (fixes localhost issue)
        const normalizedFilepath = normalizeFilepathUrl(effectiveFilepath);
        if (!currentDocumentInfo) return;
        const response = await fetch(normalizedFilepath);
        const blob = await response.blob();

        // Determine the correct MIME type based on detected file type
        const detectedType = getFileType();
        let mimeType = blob.type;
        let fileName = currentDocumentInfo?.FileName || 'document';
        let finalBlob = blob;

        // Override MIME type based on detected file type to ensure correct download
        switch (detectedType) {
          case 'pdf':
            mimeType = 'application/pdf';
            if (!fileName.toLowerCase().endsWith('.pdf')) {
              fileName = `${fileName}.pdf`;
            }

            // Convert PDF to PDF/A format for archiving
            // PDF/A is an ISO-standardized format for long-term document preservation
            try {
              toast.loading('Converting PDF to PDF/A format...', { id: 'pdfa-conversion' });
              const conversionResult = await convertPdfToPdfA(blob, currentDocumentInfo.ID);
              finalBlob = conversionResult.blob;

              // Check if conversion actually happened
              if (conversionResult.converted) {
                // Update filename to indicate PDF/A format
                const baseName = fileName.replace(/\.pdf$/i, '');
                fileName = `${baseName}_PDFA.pdf`;
                toast.success('PDF converted to PDF/A format', { id: 'pdfa-conversion' });
              } else {
                // Backend API not available - download original PDF
                toast.dismiss('pdfa-conversion');
                toast(
                  'PDF/A conversion not available. Downloading original PDF. Please implement backend conversion endpoint.',
                  {
                    id: 'pdfa-conversion',
                    duration: 4000,
                    icon: 'ℹ️'
                  }
                );
              }
            } catch (conversionError) {
              console.warn('PDF/A conversion failed, downloading original PDF:', conversionError);
              toast.dismiss('pdfa-conversion');
              toast.error('PDF/A conversion failed. Downloading original PDF.', { duration: 3000 });
              // Continue with original PDF
            }
            break;
          case 'docx':
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            if (!fileName.toLowerCase().endsWith('.docx')) {
              fileName = `${fileName}.docx`;
            }
            break;
          case 'doc':
            mimeType = 'application/msword';
            if (!fileName.toLowerCase().endsWith('.doc')) {
              fileName = `${fileName}.doc`;
            }
            break;
          case 'xlsx':
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            if (!fileName.toLowerCase().endsWith('.xlsx')) {
              fileName = `${fileName}.xlsx`;
            }
            break;
          case 'xls':
            mimeType = 'application/vnd.ms-excel';
            if (!fileName.toLowerCase().endsWith('.xls')) {
              fileName = `${fileName}.xls`;
            }
            break;
          case 'image':
            // For images, use DataType if available, otherwise infer from filename or use blob type
            if (currentDocumentInfo?.DataType && currentDocumentInfo.DataType.startsWith('image/')) {
              mimeType = currentDocumentInfo.DataType;
            } else if (!mimeType || mimeType === 'application/octet-stream') {
              // Try to infer from filename
              const lowerFileName = fileName.toLowerCase();
              if (lowerFileName.endsWith('.png')) {
                mimeType = 'image/png';
              } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) {
                mimeType = 'image/jpeg';
              } else if (lowerFileName.endsWith('.gif')) {
                mimeType = 'image/gif';
              } else if (lowerFileName.endsWith('.webp')) {
                mimeType = 'image/webp';
              } else {
                // Keep original blob type if it's a valid image type
                mimeType = blob.type || 'image/png';
              }
            }
            break;
          default:
            // For other types, use DataType if available, otherwise use blob type
            if (currentDocumentInfo?.DataType && currentDocumentInfo.DataType.startsWith('application/')) {
              mimeType = currentDocumentInfo.DataType;
            } else if (!mimeType || mimeType === 'application/octet-stream') {
              mimeType = currentDocumentInfo?.DataType || blob.type || 'application/octet-stream';
            }
        }

        // Log document download activity FIRST (before download)
        // This ensures the activity is logged even if download fails
        try {
          console.log('📥 Logging download activity for document:', currentDocumentInfo.ID);
          await logDocumentActivity(
            'DOWNLOADED',
            user!.ID,
            user!.UserName,
            currentDocumentInfo?.ID || 0,
            currentDocumentInfo?.FileName || 'Unknown',
            `Downloaded by ${user!.UserName}`
          );
          console.log('✅ Download activity logged successfully');
        } catch (logError) {
          console.error('❌ Failed to log document download activity:', logError);
          // Don't block the download if logging fails, but show a warning
          toast.error('Download will proceed, but activity logging failed. Please refresh the audit trail manually.');
        }

        // Create a new blob with the correct MIME type
        const correctedBlob = new Blob([finalBlob], { type: mimeType });
        const url = window.URL.createObjectURL(correctedBlob);

        const link = window.document.createElement('a');
        link.href = url;
        link.download = fileName;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);

        // Refresh document data to show the new audit trail entry
        // Add a small delay to allow backend to process the audit log
        setTimeout(async () => {
          try {
            console.log('🔄 Refreshing document data to update audit trail...');
            if (document?.document?.[0]?.ID) {
              await fetchDocument(String(document.document[0].ID));
              console.log('✅ Document data refreshed');
            }
          } catch (refreshError) {
            console.error('❌ Failed to refresh document data:', refreshError);
          }
        }, 1000); // 1 second delay to allow backend processing
      } catch (error) {
        console.error('Download failed:', error);
        toast.error('Failed to download document. Please try again.');
      }
    }
  };

  // Show loading state if document is not yet loaded
  if (!document || !currentDocumentInfo) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600 text-sm font-medium">Loading document information...</p>
        </div>
      </div>
    );
  }

  // Helper function to detect file type
  const getFileType = () => {
    if (!effectiveFilepath) return 'unknown';

    const filepath = effectiveFilepath.toLowerCase();
    const filename = currentDocumentInfo.FileName?.toLowerCase() || '';
    const dataType = currentDocumentInfo.DataType?.toLowerCase() || '';

    // Check by file extension first
    if (filepath.endsWith('.pdf') || filename.endsWith('.pdf')) {
      return 'pdf';
    }

    if (filepath.endsWith('.docx') || filename.endsWith('.docx')) {
      return 'docx';
    }

    if (filepath.endsWith('.doc') || filename.endsWith('.doc')) {
      return 'doc';
    }

    // Check for Excel files by extension
    if (filepath.endsWith('.xlsx') || filename.endsWith('.xlsx')) {
      return 'xlsx';
    }

    if (filepath.endsWith('.xls') || filename.endsWith('.xls')) {
      return 'xls';
    }

    // Check by MIME type from DataType field
    if (dataType.includes('pdf') || dataType === 'application/pdf') {
      return 'pdf';
    }

    if (
      dataType.includes('wordprocessingml') ||
      dataType.includes('msword') ||
      dataType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      dataType === 'application/msword'
    ) {
      return filepath.endsWith('.doc') || filename.endsWith('.doc') ? 'doc' : 'docx';
    }

    // Check for Excel files by MIME type
    if (
      dataType.includes('spreadsheetml') ||
      dataType.includes('spreadsheet') ||
      dataType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      dataType === 'application/vnd.ms-excel' ||
      dataType.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
      dataType.includes('vnd.ms-excel')
    ) {
      return filepath.endsWith('.xls') || filename.endsWith('.xls') ? 'xls' : 'xlsx';
    }

    // Check if it's an image
    if (
      dataType.startsWith('image/') ||
      filepath.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ||
      filename.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    ) {
      return 'image';
    }

    return 'unknown';
  };

  const fileType = getFileType();
  const isPDF = fileType === 'pdf';
  const isWord = fileType === 'docx' || fileType === 'doc';
  const isExcel = fileType === 'xlsx' || fileType === 'xls';
  const isImage = fileType === 'image';

  // Helper function to format file type for display
  const getFormattedFileType = () => {
    if (!currentDocumentInfo?.DataType) return 'N/A';

    const dataType = currentDocumentInfo.DataType.toLowerCase();

    // PDF
    if (dataType.includes('pdf') || fileType === 'pdf') {
      return 'PDF Document';
    }

    // Word documents
    if (
      dataType.includes('wordprocessingml') ||
      dataType.includes('msword') ||
      fileType === 'docx' ||
      fileType === 'doc'
    ) {
      return fileType === 'doc' ? 'Word Document (.doc)' : 'Word Document (.docx)';
    }

    // Excel
    if (
      dataType.includes('spreadsheetml') ||
      dataType.includes('spreadsheet') ||
      dataType.includes('ms-excel') ||
      fileType === 'xlsx' ||
      fileType === 'xls'
    ) {
      return fileType === 'xls' ? 'Excel Spreadsheet (.xls)' : 'Excel Spreadsheet (.xlsx)';
    }

    // Images
    if (dataType.startsWith('image/') || isImage) {
      const imageType = dataType.split('/')[1]?.toUpperCase() || 'Image';
      return `${imageType} Image`;
    }

    // Text files
    if (dataType.includes('text/plain') || dataType.includes('txt')) {
      return 'Text File';
    }

    // CSV
    if (dataType.includes('csv') || dataType.includes('text/csv')) {
      return 'CSV File';
    }

    // ZIP
    if (dataType.includes('zip')) {
      return 'ZIP Archive';
    }

    // If it's a long MIME type, try to extract a readable name
    if (dataType.includes('application/')) {
      const parts = dataType.split('/');
      if (parts.length > 1) {
        const subtype = parts[1].split('.');
        if (subtype.length > 0) {
          return subtype[subtype.length - 1].toUpperCase();
        }
      }
    }

    // Fallback to original DataType but truncate if too long
    return currentDocumentInfo.DataType.length > 30
      ? `${currentDocumentInfo.DataType.substring(0, 30)}...`
      : currentDocumentInfo.DataType;
  };

  // Include both field restrictions and custom area restrictions (both need masking)
  const allRestrictionsForMasking = viewerRestrictions.filter(
    (restriction) =>
      restriction.restrictedType === 'open' ||
      restriction.restrictedType === 'field'
  );
  const shouldApplyMasking = allRestrictionsForMasking.length > 0;

  const handleDownloadClick = () => {
    if (shouldApplyMasking) {
      toast.dismiss();
      toast(
        'Masked copy available inside the viewer. Click "View" to download it.',
        { duration: 4000 }
      );
      setIsViewerOpen(true);
      return;
    }
    handleDownload();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
      {isViewerOpen && effectiveFilepath ? (
        <Modal isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)}>
          {restrictionsLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Loading masking details...</p>
            </div>
          ) : restrictionsError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
              <FileText className="h-12 w-12 text-red-500" />
              <p className="text-base font-semibold text-gray-900">
                Masking information unavailable
              </p>
              <p className="text-sm text-gray-600 max-w-md">
                {restrictionsError} Please try again later or contact an administrator.
              </p>
            </div>
          ) : shouldApplyMasking ? (
            <MaskedDocumentViewer
              currentDocument={document}
              restrictions={allRestrictionsForMasking}
            />
          ) : isPDF ? (
            <div className="w-full h-full flex items-center justify-center">
              <iframe
                src={`${normalizeFilepathUrl(effectiveFilepath)}#toolbar=1`}
                title="PDF Viewer"
                className="w-full border-0 rounded-lg"
                style={{
                  height: '85vh',
                  minHeight: '600px',
                  maxHeight: '85vh'
                }}
                onError={(e) => {
                  console.error('PDF loading error:', e);
                  toast.error('Failed to load PDF. Please try downloading the file instead.');
                }}
              />
            </div>
          ) : isWord ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl w-full">
                <div className="flex flex-col items-center text-center mb-4">
                  <FileText className="h-16 w-16 text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Word Document Viewer
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Word documents cannot be viewed directly in the browser. Please download the file to view it.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Document
                  </button>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">Or try viewing online:</p>
                    <a
                      href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(normalizeFilepathUrl(effectiveFilepath))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                    >
                      <Eye className="h-4 w-4" />
                      Open in Microsoft Office Online Viewer
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : isExcel ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-2xl w-full">
                <div className="flex flex-col items-center text-center mb-4">
                  <FileText className="h-16 w-16 text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Excel Spreadsheet Viewer
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Excel spreadsheets cannot be viewed directly in the browser. Please download the file to view it.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Spreadsheet
                  </button>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">Or try viewing online:</p>
                    <a
                      href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(normalizeFilepathUrl(effectiveFilepath))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-700 text-sm font-medium underline"
                    >
                      <Eye className="h-4 w-4" />
                      Open in Microsoft Office Online Viewer
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={normalizeFilepathUrl(effectiveFilepath)}
                alt={currentDocumentInfo?.FileName || 'Document'}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('Image loading error:', e);
                  toast.error('Failed to load image.');
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-2xl w-full">
                <div className="flex flex-col items-center text-center mb-4">
                  <FileText className="h-16 w-16 text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Document Preview Not Available
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This file type cannot be previewed in the browser. Please download the file to view it.
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    File Type: {currentDocumentInfo.DataType || 'Unknown'}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium mx-auto"
                >
                  <Download className="h-4 w-4" />
                  Download Document
                </button>
              </div>
            </div>
          )}
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
                      Version {document?.versions?.[0]?.VersionNumber ?? '—'}
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formValues.FileName}
                        onChange={(e) => handleFormValueChange('FileName', e.target.value)}
                        className="w-full max-w-md text-xl font-semibold text-gray-900 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <h1 className="text-xl font-semibold text-gray-900">
                        {currentDocumentInfo?.FileName}
                      </h1>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Last modified:{' '}
                    {safeDateTimeFormat(document?.versions?.[0]?.ModificationDate)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {permissions?.Edit && (
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <button
                        onClick={handleStartEditing}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg bg-white shadow-sm hover:bg-blue-50 transition-colors text-sm font-medium"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleCancelEditing}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveChanges}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsViewerOpen(true)}
                    disabled={!effectiveFilepath || isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  {permissions?.Print && (
                    <button
                      onClick={handleDownloadClick}
                      disabled={!effectiveFilepath || isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  )}
                  {/* <button
                    onClick={handleBrownload}
                    disabled={!currentDocumentInfo?.filepath || isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg shadow-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Brownload
                  </button> */}

                </div>

              </div>

            </div>

          </div>

          {/* Document Information */}
          <div className="px-6 py-6 min-h-[400px]">
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
              {/* File Details */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-inner">
                    <FileText className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                    File Details
                  </h4>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg">
                    <span className="text-sm text-gray-500 font-medium">Format</span>
                    <span className={`text-sm font-semibold ${currentDocumentInfo?.DataType ? 'text-gray-900' : 'text-gray-500 italic'}`}>
                      {getFormattedFileType()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg">
                    <span className="text-sm text-gray-500 font-medium">Pages</span>
                    <span className={`text-sm font-semibold ${currentDocumentInfo?.PageCount ? 'text-gray-900' : 'text-gray-500 italic'}`}>
                      {currentDocumentInfo?.PageCount
                        ? currentDocumentInfo.PageCount === 1
                          ? '1 Page'
                          : `${currentDocumentInfo.PageCount} Pages`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>


              {/* Confidential Status */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-green-400 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-inner transition-all duration-300 ${currentDocumentInfo?.Confidential
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

                {isEditing ? (
                  <label className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formValues.Confidential}
                      onChange={(e) => handleFormValueChange('Confidential', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span>{formValues.Confidential ? 'Confidential document' : 'Mark as confidential'}</span>
                  </label>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-300 ${currentDocumentInfo?.Confidential
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                        }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full mr-2 ${currentDocumentInfo?.Confidential ? 'bg-red-500' : 'bg-green-500'
                          }`}
                      ></span>
                      {currentDocumentInfo?.Confidential ? 'Yes, Confidential' : 'No, Public'}
                    </span>
                  </div>
                )}
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
                  className={`text-gray-900 font-medium leading-relaxed ${isEditing ? '' : 'bg-gray-50 border border-gray-100 px-4 py-2 rounded-lg'
                    }`}
                >
                  {isEditing ? (
                    <select
                      value={formValues.DepartmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select department</option>
                      {departmentOptions.map((dept) => (
                        <option key={dept.value} value={dept.value}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    documentsDepartment?.label || 'N/A'
                  )}
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
                  className={`text-gray-900 font-medium leading-relaxed ${isEditing ? '' : 'bg-gray-50 border border-gray-100 px-4 py-2 rounded-lg'
                    }`}
                >
                  {isEditing ? (
                    <select
                      value={formValues.SubDepartmentId}
                      onChange={(e) => handleFormValueChange('SubDepartmentId', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={!formValues.DepartmentId}
                    >
                      <option value="">Select document type</option>
                      {subDepartmentOptions.map((sub) => (
                        <option key={sub.value} value={sub.value}>
                          {sub.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    documentsSubDepartment?.label || 'N/A'
                  )}
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
                {isEditing ? (
                  <input
                    type="date"
                    value={formValues.FileDate}
                    onChange={(e) => handleFormValueChange('FileDate', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                ) : (
                  <p
                    className={`text-gray-900 font-medium leading-relaxed bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg ${currentDocumentInfo?.FileDate ? 'text-gray-900' : 'text-gray-500 italic'
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
                )}
              </div>

              {/* Expiration */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center shadow-inner">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                    Expiration
                  </h4>
                </div>
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formValues.Expiration}
                        onChange={(e) => handleFormValueChange('Expiration', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span>Document has an expiration date</span>
                    </label>
                    <input
                      type="date"
                      value={formValues.ExpirationDate}
                      onChange={(e) => handleFormValueChange('ExpirationDate', e.target.value)}
                      disabled={!formValues.Expiration}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 text-sm text-gray-700">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-300 bg-gray-100 text-gray-700 border border-gray-200">
                      {currentDocumentInfo?.Expiration ? 'Expiration Enabled' : 'No Expiration'}
                    </span>
                    {currentDocumentInfo?.Expiration && currentDocumentInfo?.ExpirationDate ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-800">
                        {new Date(currentDocumentInfo.ExpirationDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    ) : null}
                  </div>
                )}
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

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        File Description
                      </label>
                      <textarea
                        value={formValues.FileDescription}
                        onChange={(e) => handleFormValueChange('FileDescription', e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Enter file description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Additional Description
                      </label>
                      <textarea
                        value={formValues.Description}
                        onChange={(e) => handleFormValueChange('Description', e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Optional internal description"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p
                      className={`text-gray-900 font-medium leading-relaxed bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg ${currentDocumentInfo?.FileDescription
                        ? 'text-gray-900'
                        : 'text-gray-500 italic'
                        }`}
                    >
                      {currentDocumentInfo?.FileDescription || 'No description available'}
                    </p>
                    {currentDocumentInfo?.Description ? (
                      <p className="text-sm text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg">
                        {currentDocumentInfo.Description}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 flex items-center justify-center shadow-inner">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-800 tracking-wide">
                    Remarks
                  </h4>
                </div>
                {isEditing ? (
                  <textarea
                    value={formValues.Remarks}
                    onChange={(e) => handleFormValueChange('Remarks', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter remarks"
                  />
                ) : (
                  <p
                    className={`text-gray-900 font-medium leading-relaxed bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg ${currentDocumentInfo?.Remarks ? 'text-gray-900' : 'text-gray-500 italic'
                      }`}
                  >
                    {currentDocumentInfo?.Remarks || 'No remarks recorded'}
                  </p>
                )}
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
                      const fieldKey = `${field.DataType === 'Date' ? 'Date' : 'Text'}${field.FieldNumber}`;
                      const dynamicValue = dynamicFieldValues[fieldKey] ?? '';

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
                              {isEditing ? (
                                <input
                                  type={field.DataType === 'Date' ? 'date' : 'text'}
                                  value={dynamicValue}
                                  onChange={(e) => handleDynamicFieldChange(fieldKey, e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              ) : (
                                <p className="text-gray-900 font-medium bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg">
                                  {field.DataType === 'Date'
                                    ? formatDateValue(fieldValue)
                                    : fieldValue || 'N/A'}
                                </p>
                              )}
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