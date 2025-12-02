import axios from "@/api/axios";

export interface FieldAllocation {
  ID: number;
  Field: string;
  Type: string;
  Description: string;
  DepartmentId: number;
  SubDepartmentId: number;
  UserId: number;
  View: boolean;
  Add: boolean;
  Edit: boolean;
  Delete: boolean;
  Print: boolean;
  Confidential: boolean;
  IsActive?: boolean;
  FieldNumber?: number; // FieldNumber for mapping to database columns (Text1-10, Date1-10)
}

export interface FieldAllocationResponse {
  fields: FieldAllocation[];
  userPermissions: {
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
  };
}

/**
 * Fetch field allocations for a specific department and subdepartment
 */
export const fetchFieldAllocations = async (
  departmentId: number,
  subDepartmentId: number,
  userId: number
): Promise<FieldAllocationResponse> => {
  try {
    const response = await axios.get(
      `/allocation/fields/${departmentId}/${subDepartmentId}/${userId}`
    );
    return response.data.data;
  } catch (error: any) {
    // If 404 or 400, user has no allocation - throw error so caller can handle it
    if (error?.response?.status === 404 || error?.response?.status === 400) {
      throw error; // Re-throw so useAllocationPermissions can handle it properly
    }
    // For other errors, log and throw
    console.error('Failed to fetch field allocations:', error);
    throw error;
  }
};

/**
 * Fetch available fields for a department/subdepartment combination
 */
export const fetchAvailableFields = async (
  departmentId: number,
  subDepartmentId: number
): Promise<FieldAllocation[]> => {
  try {
    const response = await axios.get(
      `/allocation/available-fields/${departmentId}/${subDepartmentId}`
    );
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch available fields:', error);
    // Return empty array if API fails - this allows the system to work without field allocations
    return [];
  }
};

/**
 * Fetch role-based permissions for a specific role, department and subdepartment
 */
export const fetchRoleBasedPermissions = async (
  departmentId: number,
  subDepartmentId: number,
  roleId: number
): Promise<FieldAllocationResponse | null> => {
  try {
    // Try to fetch role allocations first
    const { fetchRoleAllocations, fetchRoleAllocationsByLink } = await import('../../Digitalization/utils/allocationServices');
    
    let roleAllocs = await fetchRoleAllocations(departmentId, subDepartmentId);
    
    // If empty, try by LinkID as fallback
    if (!roleAllocs || roleAllocs.length === 0) {
      roleAllocs = await fetchRoleAllocationsByLink(subDepartmentId);
    }
    
    console.log('🔍 Searching for role allocation:', {
      roleId,
      totalRoleAllocs: roleAllocs?.length || 0,
      availableRoleIds: roleAllocs?.map((a: any) => a.UserAccessID),
      linkId: subDepartmentId,
    });
    
    // CRITICAL: Find the allocation for the specific role
    // Must match BOTH LinkID and UserAccessID to ensure correct isolation
    const roleAlloc = roleAllocs?.find(
      (alloc: any) => {
        const matchesRole = Number(alloc.UserAccessID) === Number(roleId);
        const matchesLink = Number(alloc.LinkID) === Number(subDepartmentId);
        const match = matchesRole && matchesLink;
        
        if (match) {
          console.log('✅ Found matching allocation:', {
            UserAccessID: alloc.UserAccessID,
            LinkID: alloc.LinkID,
            roleId,
            linkId: subDepartmentId,
          });
        }
        
        return match;
      }
    );
    
    if (!roleAlloc) {
      console.log('⚠️ Role allocation not found for roleId:', {
        roleId,
        linkId: subDepartmentId,
        availableRoleIds: roleAllocs?.map((a: any) => ({
          UserAccessID: a.UserAccessID,
          LinkID: a.LinkID,
        })),
        message: 'This role has no allocation for this document type. Permissions will be denied.',
      });
      return null;
    }
    
    console.log('✅ Found role allocation:', {
      roleId: roleAlloc.UserAccessID,
      rawPermissions: {
        View: roleAlloc.View,
        Add: roleAlloc.Add,
        Edit: roleAlloc.Edit,
        Delete: roleAlloc.Delete,
        Print: roleAlloc.Print,
        Confidential: roleAlloc.Confidential,
        Comment: roleAlloc.Comment,
        Collaborate: roleAlloc.Collaborate,
        Finalize: roleAlloc.Finalize,
        Masking: roleAlloc.Masking,
      },
    });
    
    // Helper function to convert any value to boolean
    const toBool = (val: any): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val === 1;
      if (typeof val === 'string') return val === '1' || val === 'true' || val === 'True';
      return false;
    };
    
    const permissions = {
      View: toBool(roleAlloc.View),
      Add: toBool(roleAlloc.Add),
      Edit: toBool(roleAlloc.Edit),
      Delete: toBool(roleAlloc.Delete),
      Print: toBool(roleAlloc.Print),
      Confidential: toBool(roleAlloc.Confidential),
      Comment: toBool(roleAlloc.Comment),
      Collaborate: toBool(roleAlloc.Collaborate),
      Finalize: toBool(roleAlloc.Finalize),
      Masking: toBool(roleAlloc.Masking),
    };
    
    console.log('✅ Converted permissions:', permissions);
    
    // Convert role allocation to FieldAllocationResponse format
    return {
      fields: roleAlloc.fields || [],
      userPermissions: permissions,
    };
  } catch (error) {
    console.error('Failed to fetch role-based permissions:', error);
    return null;
  }
};
