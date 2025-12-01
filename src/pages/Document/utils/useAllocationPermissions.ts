import { useState, useEffect } from 'react';
import { fetchFieldAllocations } from './fieldAllocationService';
import { useAuth } from '@/contexts/AuthContext';

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
  const { selectedRole } = useAuth(); // Get the current selected role
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
        console.log('🔍 Loading allocation permissions:', {
          departmentId,
          subDepartmentId,
          userId,
          selectedRoleId: selectedRole?.ID,
          selectedRoleName: selectedRole?.Description,
        });

        // IMPORTANT: Permissions should be checked by ROLE, not by USER
        // First, try to fetch permissions from role allocations (role-based)
        let data: any = null;
        
        if (selectedRole?.ID) {
          try {
            const { fetchRoleBasedPermissions } = await import('./fieldAllocationService');
            console.log('🔍 Trying to fetch role-based permissions for role:', selectedRole.ID);
            data = await fetchRoleBasedPermissions(departmentId, subDepartmentId, selectedRole.ID);
            
            if (data) {
              console.log('✅ Found role-based permissions:', {
                roleId: selectedRole.ID,
                roleName: selectedRole.Description,
                permissions: data.userPermissions,
              });
            } else {
              console.log('⚠️ No role-based permissions found, falling back to user-based API');
            }
          } catch (roleError) {
            console.warn('Failed to fetch role-based permissions, falling back to user API:', roleError);
          }
        }
        
        // Fallback to user-based API if role-based didn't work
        if (!data) {
          console.log('📥 Fetching permissions from user-based API...');
          data = await fetchFieldAllocations(departmentId, subDepartmentId, userId);
        }
        
        console.log('📥 Final permissions data:', {
          userPermissions: data.userPermissions,
          fieldsCount: data.fields?.length || 0,
          hasFields: data.fields && data.fields.length > 0,
        });
        
        // IMPORTANT: For role allocations, it's normal to have empty fields array []
        // The fields array is only populated for user-specific field allocations
        // Role allocations grant permissions at the role level, not field level
        // 
        // Trust the backend response - if it successfully returned permissions, use them
        // The backend API is the source of truth for permissions
        // Empty fields array is normal for role-based allocations
        console.log('✅ Setting permissions from response:', {
          permissions: data.userPermissions,
          fieldsCount: data.fields?.length || 0,
          source: selectedRole?.ID ? 'role-based' : 'user-based',
        });
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
          // On any other error, also deny permissions by default
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
        }
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [departmentId, subDepartmentId, userId, selectedRole?.ID]); // Re-run when selected role changes

  return { permissions, loading, error };
};

