// hooks/useDocumentTypeSelection.js
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useState, useEffect, useMemo } from 'react';

export const useDocumentTypeSelection = () => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState('');
  const [documentTypeOptions, setDocumentTypeOptions] = useState<any[]>([]);

  const {
    departmentOptions,
    getSubDepartmentOptions,
    loading: loadingDepartments,
  } = useNestedDepartmentOptions();

  // Update document types (sub-departments) when department selection changes
  useEffect(() => {
    if (selectedDepartmentId && departmentOptions.length > 0) {
      const selectedDeptId = departmentOptions.find(
        (dept) => dept.value === selectedDepartmentId
      )?.value;

      if (selectedDeptId) {
        const documentTypes = getSubDepartmentOptions(
          Number(selectedDeptId)
        ) as any;
        setDocumentTypeOptions(documentTypes);
        // Only reset if the current document type doesn't exist in new options
        if (
          !documentTypes.some(
            (docType: any) => docType.value === selectedDocumentTypeId
          )
        ) {
          setSelectedDocumentTypeId('');
        }
      }
    } else {
      setDocumentTypeOptions([]);
      if (selectedDocumentTypeId) {
        setSelectedDocumentTypeId('');
      }
    }
  }, [selectedDepartmentId, departmentOptions]);

  const selectedDepartmentLabel = useMemo(() => {
    return (
      departmentOptions.find((dept) => dept.value === selectedDepartmentId)
        ?.label ?? ''
    );
  }, [departmentOptions, selectedDepartmentId]);

  const selectedDocumentTypeLabel = useMemo(() => {
    return (
      documentTypeOptions.find(
        (docType: any) => docType.value === selectedDocumentTypeId
      )?.label ?? ''
    );
  }, [documentTypeOptions, selectedDocumentTypeId]);

  const resetSelection = () => {
    setSelectedDepartmentId('');
    setSelectedDocumentTypeId('');
    setDocumentTypeOptions([]);
  };

  return {
    selectedDepartmentId,
    setSelectedDepartmentId,
    selectedDepartmentLabel,
    selectedDocumentTypeId,
    setSelectedDocumentTypeId,
    selectedDocumentTypeLabel,
    departmentOptions,
    documentTypeOptions,
    loadingDepartments,
    resetSelection,
  };
};
