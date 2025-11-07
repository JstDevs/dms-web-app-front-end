import { useState, useEffect } from 'react';
import { fetchFieldAllocations, fetchAvailableFields, FieldAllocation, FieldAllocationResponse } from './fieldAllocationService';
import { fetchFieldsByLink, Field } from '../../Digitalization/utils/allocationServices';

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
    Comment: false,
    Collaborate: false,
    Finalize: false,
    Masking: false,
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
        Comment: false,
        Collaborate: false,
        Finalize: false,
        Masking: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to fetch user-specific allocations first
      let data: FieldAllocationResponse;
      try {
        data = await fetchFieldAllocations(departmentId, subDepartmentId, userId);
      } catch (err: any) {
        // If user-specific allocations don't exist (404), fall back to available fields
        if (err?.response?.status === 404 || err?.response?.status === 400) {
          console.log('User-specific allocations not found, falling back to available fields');
          // Fall back to loading available fields
          await loadAvailableFields();
          // Set default permissions when using available fields
          setUserPermissions({
            View: true,
            Add: true,
            Edit: true,
            Delete: true,
            Print: true,
            Confidential: true,
            Comment: true,
            Collaborate: true,
            Finalize: true,
            Masking: true,
          });
          return;
        }
        throw err; // Re-throw if it's not a 404
      }

      // Fetch fields by link to determine active status
      const current = await fetchFieldsByLink(subDepartmentId);

      // Build map from current by-link to check active status
      const currentMap = new Map<number, Field>(
        (current || []).map((c: Field) => [Number(c.FieldNumber), c])
      );

      // Merge user allocations with active status from fields by link
      const fieldsWithActive: FieldAllocation[] = (data.fields || []).map((f: any) => {
        const fid = Number(f.ID ?? f.FieldNumber ?? 0);
        const currentMatch = currentMap.get(fid);
        const activeVal = currentMatch ? (currentMatch as any).Active : (f as any)?.Active;
        const isActive = activeVal === 1 || activeVal === '1' || activeVal === true || activeVal === 'true';
        
        // Preserve FieldNumber from currentMatch or field
        const fieldNumber = currentMatch?.FieldNumber ?? f.FieldNumber ?? fid;
        
        return {
          ...f,
          IsActive: isActive,
          FieldNumber: fieldNumber, // Preserve FieldNumber for backend mapping
        };
      });

      setFieldAllocations(fieldsWithActive);
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
      // Fetch both available fields and fields by link to determine active status
      const [available, current] = await Promise.all([
        fetchAvailableFields(departmentId, subDepartmentId),
        fetchFieldsByLink(subDepartmentId),
      ]);

      // Build map from current by-link to check active status
      const currentMap = new Map<number, Field>(
        (current || []).map((c: Field) => [Number(c.FieldNumber), c])
      );

      // Merge available fields with active status from fields by link (same logic as Allocation)
      const fieldsWithActive: FieldAllocation[] = (available || []).map((f: any) => {
        const fid = Number(f.ID ?? f.FieldNumber ?? 0);
        const currentMatch = currentMap.get(fid);
        const activeVal = currentMatch ? (currentMatch as any).Active : (f as any)?.Active;
        const isActive = activeVal === 1 || activeVal === '1' || activeVal === true || activeVal === 'true';
        
        // Normalize field structure to match FieldAllocation interface
        // For available fields, Add/Edit/View should default to true for display purposes
        // but validation should only require fields explicitly marked as required
        // FieldNumber is important for mapping to database columns
        const fieldNumber = currentMatch?.FieldNumber ?? f.FieldNumber ?? fid;
        
        return {
          ID: fid,
          Field: String(currentMatch?.Description ?? f.Field ?? f.Description ?? ''),
          Type: String((currentMatch?.DataType ?? f.Type ?? f.DataType ?? 'text')).toLowerCase(),
          Description: String(currentMatch?.Description ?? f.Description ?? f.Field ?? ''),
          DepartmentId: f.DepartmentId ?? departmentId,
          SubDepartmentId: f.SubDepartmentId ?? subDepartmentId,
          UserId: f.UserId ?? 0,
          View: f.View !== undefined ? f.View : true, // Only default if not set
          Add: f.Add !== undefined ? f.Add : false, // Default to false - fields are optional unless explicitly required
          Edit: f.Edit !== undefined ? f.Edit : true,
          Delete: f.Delete ?? false,
          Print: f.Print ?? false,
          Confidential: f.Confidential ?? false,
          IsActive: isActive,
          FieldNumber: fieldNumber, // Preserve FieldNumber for backend mapping
        };
      });

      // Filter to show only active fields (like in allocation)
      const activeFieldsOnly = fieldsWithActive.filter(f => f.IsActive === true);
      setFieldAllocations(activeFieldsOnly);
    } catch (err) {
      setError('Failed to load available fields');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load field allocations when dependencies change
  useEffect(() => {
    // Always load available fields when department and subdepartment are selected
    // This ensures we show active fields from allocation regardless of user-specific allocations
    if (departmentId && subDepartmentId) {
      if (userId) {
        // Try user-specific allocations first, but it will fall back to available fields if 404
        loadFieldAllocations();
      } else {
        // Load available fields directly
        loadAvailableFields();
      }
    } else {
      // Clear fields if department/subdepartment not selected
      setFieldAllocations([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, subDepartmentId, userId]);

  // Get active fields (fields that are enabled for this user/department and marked as active in allocation)
  const getActiveFields = () => {
    // If fields have IsActive property, filter by it; otherwise use permission-based filtering
    return fieldAllocations.filter(field => {
      // For user-specific allocations, check permissions
      if (userId) {
        return (field.Add || field.Edit || field.View) && (field.IsActive !== false);
      }
      // For available fields, only show those marked as active in allocation
      return field.IsActive === true;
    });
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
