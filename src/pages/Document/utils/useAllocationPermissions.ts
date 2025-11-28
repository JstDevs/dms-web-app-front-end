import { useState, useEffect } from 'react';
import { fetchFieldAllocations } from './fieldAllocationService';
import { fetchRoleAllocations } from '../../Digitalization/utils/allocationServices';
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
        const data = await fetchFieldAllocations(departmentId, subDepartmentId, userId);
        
        // Safety check: If backend returns all true permissions but no fields/allocations exist,
        // treat it as "no allocation" and deny all permissions
        // This handles cases where backend incorrectly returns all true by default
        const hasAllTrue = Object.values(data.userPermissions).every(perm => perm === true);
        const hasNoFields = !data.fields || data.fields.length === 0;
        
        // Additional check: If all permissions are true but we have no actual role allocations,
        // this is suspicious. However, we can't check role allocations here without another API call.
        // For now, if all permissions are true AND no fields, deny access.
        // If there are fields but all permissions are true, we still need to be cautious.
        // The backend should only return true permissions if there's an actual allocation.
        if (hasAllTrue && hasNoFields) {
          // Backend returned all true but no actual allocations - verify if role allocations exist
          // If role allocations exist, the backend might be buggy but we should check
          try {
            // Try fetching by department/subdepartment first
            let roleAllocs = await fetchRoleAllocations(departmentId, subDepartmentId);
            
            // If empty and we have subDepartmentId, try fetching by LinkID as fallback
            // (The Allocation page uses this method, so it might work even if the other endpoint has 500 error)
            if ((!roleAllocs || roleAllocs.length === 0) && subDepartmentId) {
              try {
                const { fetchRoleAllocationsByLink } = await import('../../Digitalization/utils/allocationServices');
                const byLinkAllocs = await fetchRoleAllocationsByLink(subDepartmentId);
                if (byLinkAllocs && byLinkAllocs.length > 0) {
                  // IMPORTANT: Filter by departmentId if available in the response
                  // The LinkID (subDepartmentId) should be unique per department, but we filter to be safe
                  // Note: RoleDocumentAccess might not have DepartmentId field, so we rely on LinkID matching
                  // If backend returns DepartmentId, we can filter by it
                  roleAllocs = byLinkAllocs.filter((alloc: any) => {
                    // First, verify LinkID matches (this is the primary filter)
                    const allocLinkID = Number(alloc.LinkID);
                    const requestedSubDept = Number(subDepartmentId);
                    if (allocLinkID !== requestedSubDept) {
                      return false;
                    }
                    
                    // If allocation has DepartmentId, verify it matches
                    if (alloc.DepartmentId !== undefined) {
                      return Number(alloc.DepartmentId) === Number(departmentId);
                    }
                    // If no DepartmentId field, trust that LinkID (subDepartmentId) is unique per department
                    // This should be safe since SubDepartmentId should be unique
                    return true;
                  });
                }
              } catch (linkError) {
                // Silently handle error
              }
            }
            
            if (roleAllocs && roleAllocs.length > 0) {
              // Role allocations exist, but backend returned all true with no fields
              // Check if the user is actually assigned to any of these roles
              const { fetchUsersByRole } = await import('../../Digitalization/utils/allocationServices');
              
              // IMPORTANT: Filter role allocations to only include the CURRENT SELECTED ROLE
              // User may have multiple roles, but we should only use permissions from the active/selected role
              const filteredRoleAllocs = selectedRole 
                ? roleAllocs.filter((alloc: any) => alloc.UserAccessID === selectedRole.ID)
                : roleAllocs;
              
              if (filteredRoleAllocs.length === 0) {
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
                setLoading(false);
                return;
              }
              
              // Use filtered role allocations instead of all role allocations
              roleAllocs = filteredRoleAllocs;
              
              let userIsAssignedToRole = false;
              const roleChecks = await Promise.all(
                roleAllocs.map(async (alloc) => {
                  try {
                    const usersInRole = await fetchUsersByRole(alloc.UserAccessID);
                    const userInThisRole = usersInRole.some(u => u.ID === userId);
                    
                    return {
                      roleId: alloc.UserAccessID,
                      roleName: alloc.userAccess?.Description || `Role ${alloc.UserAccessID}`,
                      hasView: alloc.View === 1,
                      linkId: alloc.LinkID,
                      usersInRole: usersInRole.map(u => ({ id: u.ID, name: u.UserName })),
                      userIsInRole: userInThisRole,
                    };
                  } catch (err) {
                    return {
                      roleId: alloc.UserAccessID,
                      roleName: alloc.userAccess?.Description || `Role ${alloc.UserAccessID}`,
                      hasView: alloc.View === 1,
                      linkId: alloc.LinkID,
                      usersInRole: [],
                      userIsInRole: false,
                      error: true,
                    };
                  }
                })
              );
              
              userIsAssignedToRole = roleChecks.some(check => check.userIsInRole);
              
              if (!userIsAssignedToRole) {
                // User is NOT assigned to any role with allocations
                // Deny access - user is not assigned to the role
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
                // User IS assigned to a role with allocations
                // Backend returned wrong permissions, so we'll calculate them manually from role allocations
                // IMPORTANT: Only use roles that match the CURRENT SELECTED ROLE
                const assignedRoleChecks = roleChecks.filter(r => {
                  const isAssigned = r.userIsInRole;
                  const matchesSelectedRole = selectedRole ? r.roleId === selectedRole.ID : true;
                  return isAssigned && matchesSelectedRole;
                });
                
                if (assignedRoleChecks.length === 0) {
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
                  setLoading(false);
                  return;
                }
                
                // Merge permissions from all roles the user is assigned to (OR logic)
                // If any role grants a permission, user has it
                const calculatedPermissions: AllocationPermissions = {
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
                };
                
                // Helper function to convert any value to boolean (same as in Allocation.tsx)
                const toBool = (val: any): boolean => {
                  if (typeof val === 'boolean') return val;
                  if (typeof val === 'number') return val === 1;
                  if (typeof val === 'string') return val === '1' || val === 'true' || val === 'True';
                  return false;
                };
                
                // Find the role allocations for the roles the user is assigned to
                // IMPORTANT: Only use role allocations that match the specific department/subdepartment
                assignedRoleChecks.forEach(roleCheck => {
                  // Find the role allocation that matches BOTH the roleId AND the LinkID
                  const roleAlloc = roleAllocs.find(r => 
                    r.UserAccessID === roleCheck.roleId && 
                    Number(r.LinkID) === Number(subDepartmentId)
                  );
                  
                  if (roleAlloc) {
                    // Double-check that this allocation is for the correct LinkID (subDepartmentId)
                    const allocLinkID = Number(roleAlloc.LinkID);
                    const requestedSubDept = Number(subDepartmentId);
                    
                    if (allocLinkID !== requestedSubDept) {
                      return; // Skip this allocation - it's for a different subdepartment
                    }
                    
                    // Also check DepartmentId if available
                    const allocDeptId = (roleAlloc as any).DepartmentId;
                    if (allocDeptId !== undefined) {
                      const allocDeptIdNum = Number(allocDeptId);
                      const requestedDeptId = Number(departmentId);
                      
                      if (allocDeptIdNum !== requestedDeptId) {
                        return; // Skip this allocation - it's for a different department
                      }
                    }
                    
                    // Merge permissions (OR logic - if any role grants it, user has it)
                    // Use toBool to handle number (1/0), string ('1'/'0'), or boolean values
                    calculatedPermissions.View = calculatedPermissions.View || toBool(roleAlloc.View);
                    calculatedPermissions.Add = calculatedPermissions.Add || toBool(roleAlloc.Add);
                    calculatedPermissions.Edit = calculatedPermissions.Edit || toBool(roleAlloc.Edit);
                    calculatedPermissions.Delete = calculatedPermissions.Delete || toBool(roleAlloc.Delete);
                    calculatedPermissions.Print = calculatedPermissions.Print || toBool(roleAlloc.Print);
                    calculatedPermissions.Confidential = calculatedPermissions.Confidential || toBool(roleAlloc.Confidential);
                    calculatedPermissions.Comment = calculatedPermissions.Comment || toBool(roleAlloc.Comment);
                    calculatedPermissions.Collaborate = calculatedPermissions.Collaborate || toBool(roleAlloc.Collaborate);
                    calculatedPermissions.Finalize = calculatedPermissions.Finalize || toBool(roleAlloc.Finalize);
                    calculatedPermissions.Masking = calculatedPermissions.Masking || toBool(roleAlloc.Masking);
                  }
                });
                
                setPermissions(calculatedPermissions);
              }
            } else {
              // No role allocations exist at all - definitely deny access
              // BUT: This could also mean the endpoint returned 500 error (which fetchRoleAllocations treats as empty)
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
          } catch (verifyError: any) {
            // If we can't verify (e.g., 500 error), deny access to be safe
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
        } else if (hasAllTrue) {
          // Backend returned all true permissions with fields - verify that role allocations actually exist
          // If no role allocations exist, this is likely a backend bug (defaulting to all true)
          try {
            const roleAllocs = await fetchRoleAllocations(departmentId, subDepartmentId);
            if (!roleAllocs || roleAllocs.length === 0) {
              // No role allocations exist but backend returned all true - deny access
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
              // Role allocations exist, so all true permissions might be valid
              setPermissions(data.userPermissions);
            }
          } catch (verifyError: any) {
            // If we can't verify (e.g., 500 error on role allocations endpoint), 
            // trust the backend response since it successfully returned permissions
            // The backend should handle the role checking logic
            setPermissions(data.userPermissions);
          }
        } else {
          // Backend returned mixed permissions (some true, some false) - trust the backend
          // This is the normal case when user has specific permissions set
          setPermissions(data.userPermissions);
        }
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

