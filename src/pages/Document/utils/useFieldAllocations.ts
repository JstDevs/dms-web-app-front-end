import { useState, useEffect } from 'react';
import { fetchFieldAllocations, fetchAvailableFields, FieldAllocation, FieldAllocationResponse } from './fieldAllocationService';

export interface UseFieldAllocationsProps {
  departmentId: number | null;
  subDepartmentId: number | null;
  userId: number | null;
}

export const useFieldAllocations = ({ departmentId, subDepartmentId, userId }: UseFieldAllocationsProps) => {
  const [fieldAllocations, setFieldAllocations] = useState<FieldAllocation[]>([]);
  const [userPermissions, setUserPermissions] = useState({
    View: false,
    Add: false,
    Edit: false,
    Delete: false,
    Print: false,
    Confidential: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFieldAllocations = async () => {
    if (!departmentId || !subDepartmentId || !userId) {
      setFieldAllocations([]);
      setUserPermissions({
        View: false,
        Add: false,
        Edit: false,
        Delete: false,
        Print: false,
        Confidential: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFieldAllocations(departmentId, subDepartmentId, userId);
      setFieldAllocations(data.fields);
      setUserPermissions(data.userPermissions);
    } catch (err) {
      setError('Failed to load field allocations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFields = async () => {
    if (!departmentId || !subDepartmentId) {
      setFieldAllocations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fields = await fetchAvailableFields(departmentId, subDepartmentId);
      setFieldAllocations(fields);
    } catch (err) {
      setError('Failed to load available fields');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load field allocations when dependencies change
  useEffect(() => {
    if (userId) {
      loadFieldAllocations();
    } else {
      loadAvailableFields();
    }
  }, [departmentId, subDepartmentId, userId]);

  // Get active fields (fields that are enabled for this user/department)
  const getActiveFields = () => {
    return fieldAllocations.filter(field => 
      field.Add || field.Edit || field.View
    );
  };

  // Get fields by type
  const getFieldsByType = (type: 'text' | 'date') => {
    return getActiveFields().filter(field => field.Type === type);
  };

  return {
    fieldAllocations,
    userPermissions,
    loading,
    error,
    getActiveFields,
    getFieldsByType,
    refreshFields: userId ? loadFieldAllocations : loadAvailableFields,
  };
};
