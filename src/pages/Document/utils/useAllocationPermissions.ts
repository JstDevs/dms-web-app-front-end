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
        
        // Log the response for debugging
        console.log('🔍 Permission response from backend:', {
          departmentId,
          subDepartmentId,
          userId,
          hasFields: data.fields?.length > 0,
          fieldsCount: data.fields?.length || 0,
          permissions: data.userPermissions,
          allTrue: Object.values(data.userPermissions).every(perm => perm === true),
          hasView: data.userPermissions.View,
          fullResponse: data, // Log full response to see what backend actually returns
        });
        
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
              console.log('🔄 Trying to fetch role allocations by LinkID as fallback:', subDepartmentId);
              try {
                const { fetchRoleAllocationsByLink } = await import('../../Digitalization/utils/allocationServices');
                const byLinkAllocs = await fetchRoleAllocationsByLink(subDepartmentId);
                if (byLinkAllocs && byLinkAllocs.length > 0) {
                  console.log('✅ Found role allocations by LinkID:', byLinkAllocs.length);
                  // IMPORTANT: Filter by departmentId if available in the response
                  // The LinkID (subDepartmentId) should be unique per department, but we filter to be safe
                  // Note: RoleDocumentAccess might not have DepartmentId field, so we rely on LinkID matching
                  // If backend returns DepartmentId, we can filter by it
                  const originalCount = byLinkAllocs.length;
                  roleAllocs = byLinkAllocs.filter((alloc: any) => {
                    // First, verify LinkID matches (this is the primary filter)
                    const allocLinkID = Number(alloc.LinkID);
                    const requestedSubDept = Number(subDepartmentId);
                    if (allocLinkID !== requestedSubDept) {
                      console.warn(`⚠️ [Permission Check] Filtering out allocation - LinkID mismatch:`, {
                        roleId: alloc.UserAccessID,
                        roleName: alloc.userAccess?.Description,
                        allocLinkID,
                        requestedSubDept,
                      });
                      return false;
                    }
                    
                    // If allocation has DepartmentId, verify it matches
                    if (alloc.DepartmentId !== undefined) {
                      const matches = Number(alloc.DepartmentId) === Number(departmentId);
                      if (!matches) {
                        console.warn(`⚠️ [Permission Check] Filtering out allocation - DepartmentId mismatch:`, {
                          roleId: alloc.UserAccessID,
                          roleName: alloc.userAccess?.Description,
                          allocDepartmentId: alloc.DepartmentId,
                          requestedDepartmentId: departmentId,
                        });
                      }
                      return matches;
                    }
                    // If no DepartmentId field, trust that LinkID (subDepartmentId) is unique per department
                    // This should be safe since SubDepartmentId should be unique
                    return true;
                  });
                  console.log(`🔍 [Permission Check] Filtered role allocations: ${originalCount} → ${roleAllocs.length}`, {
                    departmentId,
                    subDepartmentId,
                    originalCount,
                    filteredCount: roleAllocs.length,
                  });
                  console.log(`🔍 Filtered role allocations for department ${departmentId}:`, roleAllocs.length);
                }
              } catch (linkError) {
                console.warn('Failed to fetch by LinkID:', linkError);
              }
            }
            
            console.log('🔍 [Permission Check] Checking role allocations:', {
              departmentId,
              subDepartmentId,
              userId,
              roleAllocsCount: roleAllocs?.length || 0,
              roleAllocs: roleAllocs.map((r: any) => ({
                id: r.id,
                roleId: r.UserAccessID,
                roleName: r.userAccess?.Description,
                linkId: r.LinkID,
                departmentId: r.DepartmentId,
                View: r.View,
                Add: r.Add,
                Edit: r.Edit,
                Delete: r.Delete,
              })),
            });
            
            if (roleAllocs && roleAllocs.length > 0) {
              // Role allocations exist, but backend returned all true with no fields
              // Check if the user is actually assigned to any of these roles
              const { fetchUsersByRole } = await import('../../Digitalization/utils/allocationServices');
              
              console.log('🔍 [Permission Check] Checking if user is assigned to roles:', {
                userId,
                departmentId,
                subDepartmentId,
                selectedRole: selectedRole ? {
                  id: selectedRole.ID,
                  name: selectedRole.Description,
                } : null,
                roleAllocationsFound: roleAllocs.map((r: any) => ({
                  id: r.id,
                  linkId: r.LinkID,
                  roleId: r.UserAccessID,
                  roleName: r.userAccess?.Description,
                  View: r.View,
                  Add: r.Add,
                  Edit: r.Edit,
                  matchesSelectedRole: selectedRole ? r.UserAccessID === selectedRole.ID : false,
                })),
              });
              
              // IMPORTANT: Filter role allocations to only include the CURRENT SELECTED ROLE
              // User may have multiple roles, but we should only use permissions from the active/selected role
              const filteredRoleAllocs = selectedRole 
                ? roleAllocs.filter((alloc: any) => alloc.UserAccessID === selectedRole.ID)
                : roleAllocs;
              
              console.log('🔍 [Permission Check] Filtered by selected role:', {
                selectedRoleId: selectedRole?.ID,
                selectedRoleName: selectedRole?.Description,
                originalCount: roleAllocs.length,
                filteredCount: filteredRoleAllocs.length,
                filteredAllocations: filteredRoleAllocs.map((r: any) => ({
                  id: r.id,
                  linkId: r.LinkID,
                  roleId: r.UserAccessID,
                  roleName: r.userAccess?.Description,
                })),
              });
              
              if (filteredRoleAllocs.length === 0) {
                console.warn('⚠️ [Permission Check] No role allocations found for selected role:', {
                  selectedRoleId: selectedRole?.ID,
                  selectedRoleName: selectedRole?.Description,
                  availableRoleAllocations: roleAllocs.map((r: any) => ({
                    roleId: r.UserAccessID,
                    roleName: r.userAccess?.Description,
                  })),
                  message: 'User has role allocations, but not for the currently selected role',
                });
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
                    console.log(`🔍 [Permission Check] Fetching users for role ${alloc.UserAccessID} (${alloc.userAccess?.Description || 'Unknown'})...`);
                    const usersInRole = await fetchUsersByRole(alloc.UserAccessID);
                    const userInThisRole = usersInRole.some(u => u.ID === userId);
                    
                    console.log(`🔍 [Permission Check] Role ${alloc.UserAccessID} (${alloc.userAccess?.Description || 'Unknown'}):`, {
                      linkId: alloc.LinkID,
                      roleId: alloc.UserAccessID,
                      totalUsersInRole: usersInRole.length,
                      usersInRole: usersInRole.map(u => ({ id: u.ID, name: u.UserName })),
                      checkingUserId: userId,
                      userIsInRole: userInThisRole,
                      permissions: {
                        View: alloc.View,
                        Add: alloc.Add,
                        Edit: alloc.Edit,
                        Delete: alloc.Delete,
                      },
                    });
                    
                    return {
                      roleId: alloc.UserAccessID,
                      roleName: alloc.userAccess?.Description || `Role ${alloc.UserAccessID}`,
                      hasView: alloc.View === 1,
                      linkId: alloc.LinkID,
                      usersInRole: usersInRole.map(u => ({ id: u.ID, name: u.UserName })),
                      userIsInRole: userInThisRole,
                    };
                  } catch (err) {
                    console.error(`❌ [Permission Check] Failed to check users for role ${alloc.UserAccessID}:`, err);
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
              
              console.log('🔍 [Permission Check] Role check results:', {
                userId,
                departmentId,
                subDepartmentId,
                roleChecks: roleChecks.map(r => ({
                  roleId: r.roleId,
                  roleName: r.roleName,
                  linkId: r.linkId,
                  userIsInRole: r.userIsInRole,
                  usersInRoleCount: r.usersInRole.length,
                })),
              });
              
              userIsAssignedToRole = roleChecks.some(check => check.userIsInRole);
              
              console.log('🔍 [Permission Check] User assignment result:', {
                userId,
                selectedRoleId: selectedRole?.ID,
                selectedRoleName: selectedRole?.Description,
                userIsAssignedToRole,
                assignedRoles: roleChecks.filter(r => r.userIsInRole).map(r => ({
                  roleId: r.roleId,
                  roleName: r.roleName,
                  linkId: r.linkId,
                  matchesSelectedRole: selectedRole ? r.roleId === selectedRole.ID : false,
                })),
              });
              
              if (!userIsAssignedToRole) {
                // User is NOT assigned to any role with allocations
                console.warn('⚠️ Role allocations exist, but user is NOT assigned to any of these roles', {
                  departmentId,
                  subDepartmentId,
                  userId,
                  roleAllocationsCount: roleAllocs.length,
                  roleChecks: roleChecks,
                  message: `User (ID: ${userId}) needs to be assigned to one of these roles to get permissions: ${roleChecks.map(r => r.roleName).join(', ')}`,
                });
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
                
                console.log('✅ User is assigned to role(s) with allocations. Calculating permissions manually:', {
                  departmentId,
                  subDepartmentId,
                  userId,
                  selectedRoleId: selectedRole?.ID,
                  selectedRoleName: selectedRole?.Description,
                  assignedRoles: assignedRoleChecks.map(r => ({
                    roleId: r.roleId,
                    roleName: r.roleName,
                    linkId: r.linkId,
                    matchesSelectedRole: selectedRole ? r.roleId === selectedRole.ID : true,
                  })),
                });
                
                if (assignedRoleChecks.length === 0) {
                  console.warn('⚠️ [Permission Check] User is assigned to roles, but none match the selected role:', {
                    selectedRoleId: selectedRole?.ID,
                    selectedRoleName: selectedRole?.Description,
                    allAssignedRoles: roleChecks.filter(r => r.userIsInRole).map(r => ({
                      roleId: r.roleId,
                      roleName: r.roleName,
                    })),
                    message: 'User needs to switch to the correct role to access this department',
                  });
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
                console.log('🔍 [Permission Check] Processing assigned roles:', {
                  departmentId,
                  subDepartmentId,
                  userId,
                  assignedRoles: assignedRoleChecks.map(r => ({
                    roleId: r.roleId,
                    roleName: r.roleName,
                    linkId: r.linkId,
                    hasView: r.hasView,
                  })),
                  allRoleAllocations: roleAllocs.map((r: any) => ({
                    id: r.id,
                    linkId: r.LinkID,
                    roleId: r.UserAccessID,
                    roleName: r.userAccess?.Description,
                    View: r.View,
                    Add: r.Add,
                    Edit: r.Edit,
                  })),
                });
                
                assignedRoleChecks.forEach(roleCheck => {
                  // Find the role allocation that matches BOTH the roleId AND the LinkID
                  const roleAlloc = roleAllocs.find(r => 
                    r.UserAccessID === roleCheck.roleId && 
                    Number(r.LinkID) === Number(subDepartmentId)
                  );
                  
                  console.log(`🔍 [Permission Check] Looking for role allocation:`, {
                    searchingFor: {
                      roleId: roleCheck.roleId,
                      roleName: roleCheck.roleName,
                      linkId: roleCheck.linkId,
                      requestedSubDept: subDepartmentId,
                    },
                    found: !!roleAlloc,
                    roleAlloc: roleAlloc ? {
                      id: roleAlloc.id,
                      linkId: roleAlloc.LinkID,
                      departmentId: (roleAlloc as any).DepartmentId,
                      roleId: roleAlloc.UserAccessID,
                      roleName: roleAlloc.userAccess?.Description,
                    } : null,
                    availableAllocations: roleAllocs.filter(r => r.UserAccessID === roleCheck.roleId).map((r: any) => ({
                      id: r.id,
                      linkId: r.LinkID,
                      roleId: r.UserAccessID,
                    })),
                  });
                  
                  if (roleAlloc) {
                    // Double-check that this allocation is for the correct LinkID (subDepartmentId)
                    const allocLinkID = Number(roleAlloc.LinkID);
                    const requestedSubDept = Number(subDepartmentId);
                    
                    console.log(`🔍 [Permission Check] Verifying LinkID match for role ${roleCheck.roleId}:`, {
                      allocLinkID,
                      requestedSubDept,
                      match: allocLinkID === requestedSubDept,
                    });
                    
                    if (allocLinkID !== requestedSubDept) {
                      console.warn(`⚠️ [Permission Check] Skipping role allocation - LinkID mismatch:`, {
                        roleId: roleCheck.roleId,
                        roleName: roleCheck.roleName,
                        allocLinkID,
                        requestedSubDept,
                        message: 'This role allocation is for a different subdepartment',
                      });
                      return; // Skip this allocation - it's for a different subdepartment
                    }
                    
                    // Also check DepartmentId if available
                    const allocDeptId = (roleAlloc as any).DepartmentId;
                    if (allocDeptId !== undefined) {
                      const allocDeptIdNum = Number(allocDeptId);
                      const requestedDeptId = Number(departmentId);
                      
                      console.log(`🔍 [Permission Check] Verifying DepartmentId match for role ${roleCheck.roleId}:`, {
                        allocDeptId: allocDeptIdNum,
                        requestedDeptId,
                        match: allocDeptIdNum === requestedDeptId,
                      });
                      
                      if (allocDeptIdNum !== requestedDeptId) {
                        console.warn(`⚠️ [Permission Check] Skipping role allocation - DepartmentId mismatch:`, {
                          roleId: roleCheck.roleId,
                          roleName: roleCheck.roleName,
                          allocDeptId: allocDeptIdNum,
                          requestedDeptId,
                          message: 'This role allocation is for a different department',
                        });
                        return; // Skip this allocation - it's for a different department
                      }
                    }
                    
                    console.log(`✅ [Permission Check] Using role allocation for role ${roleCheck.roleId} (${roleCheck.roleName}):`, {
                      roleName: roleCheck.roleName,
                      linkId: roleAlloc.LinkID,
                      departmentId: allocDeptId,
                      View: roleAlloc.View,
                      ViewBool: toBool(roleAlloc.View),
                      Add: roleAlloc.Add,
                      Edit: roleAlloc.Edit,
                      Delete: roleAlloc.Delete,
                    });
                    
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
                
                console.log('✅ Calculated permissions from role allocations:', calculatedPermissions);
                setPermissions(calculatedPermissions);
              }
            } else {
              // No role allocations exist at all - definitely deny access
              // BUT: This could also mean the endpoint returned 500 error (which fetchRoleAllocations treats as empty)
              console.warn('⚠️ Backend returned all true permissions with no fields', {
                departmentId,
                subDepartmentId,
                userId,
                roleAllocsResult: roleAllocs,
                message: 'No role allocations found OR role allocations endpoint returned error. Check if role allocations endpoint is working.',
              });
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
            console.warn('⚠️ Cannot verify role allocations - denying access to be safe', {
              departmentId,
              subDepartmentId,
              userId,
              error: verifyError,
              errorStatus: verifyError?.response?.status,
              message: 'Role allocations endpoint may be returning 500 error. Check backend logs.',
            });
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
              console.warn('Backend returned all true permissions but no role allocations exist - denying access');
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
            console.warn('Cannot verify role allocations endpoint (may have 500 error) - trusting backend response', verifyError);
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
          console.warn('⚠️ No allocation found for user:', {
            departmentId,
            subDepartmentId,
            userId,
            error: err?.response?.status,
            message: 'User may not be assigned to a role with allocations, or no role allocations exist for this department/subdepartment',
          });
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

