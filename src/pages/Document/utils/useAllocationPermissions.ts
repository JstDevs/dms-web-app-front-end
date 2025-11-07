import { useState, useEffect } from 'react';
import { fetchFieldAllocations } from './fieldAllocationService';

export interface AllocationPermissions {
  View: boolean;
  Add: boolean;
  Edit: boolean;
  Delete: boolean;
  Print: boolean;
  Confidential: boolean;
  Comment: boolean;
  Collaborate: boolean;
  Finalize: boolean;
  Masking: boolean;
}

export interface UseAllocationPermissionsProps {
  departmentId: number | null;
  subDepartmentId: number | null;
  userId: number | null;
}

export const useAllocationPermissions = ({
  departmentId,
  subDepartmentId,
  userId,
}: UseAllocationPermissionsProps) => {
  const [permissions, setPermissions] = useState<AllocationPermissions>({
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

  useEffect(() => {
    const loadPermissions = async () => {
      if (!departmentId || !subDepartmentId || !userId) {
        setPermissions({
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
        const data = await fetchFieldAllocations(departmentId, subDepartmentId, userId);
        setPermissions(data.userPermissions);
      } catch (err: any) {
        // If 404, user has no allocation - default to no permissions
        if (err?.response?.status === 404 || err?.response?.status === 400) {
          setPermissions({
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
        } else {
          setError('Failed to load permissions');
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [departmentId, subDepartmentId, userId]);

  return { permissions, loading, error };
};

