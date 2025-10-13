// hooks/useDocumentTypeSelection.js
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useState, useEffect } from 'react';

export const useDocumentTypeSelection = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [documentTypeOptions, setDocumentTypeOptions] = useState([]);

  const {
    departmentOptions,
    getSubDepartmentOptions,
    loading: loadingDepartments,
  } = useNestedDepartmentOptions();

  // Update document types (sub-departments) when department selection changes
  useEffect(() => {
    if (selectedDepartment && departmentOptions.length > 0) {
      const selectedDeptId = departmentOptions.find(
        (dept) => dept.label === selectedDepartment
      )?.value;

      if (selectedDeptId) {
        const documentTypes = getSubDepartmentOptions(
          Number(selectedDeptId)
        ) as any;
        setDocumentTypeOptions(documentTypes);
        // Only reset if the current document type doesn't exist in new options
        if (
          !documentTypes.some(
            (docType: any) => docType.label === selectedDocumentType
          )
        ) {
          setSelectedDocumentType('');
        }
      }
    } else {
      setDocumentTypeOptions([]);
      if (selectedDocumentType) {
        setSelectedDocumentType('');
      }
    }
  }, [selectedDepartment, departmentOptions]);

  const resetSelection = () => {
    setSelectedDepartment('');
    setSelectedDocumentType('');
    setDocumentTypeOptions([]);
  };

  return {
    selectedDepartment,
    setSelectedDepartment,
    selectedDocumentType,
    setSelectedDocumentType,
    departmentOptions,
    documentTypeOptions,
    loadingDepartments,
    resetSelection,
  };
};
