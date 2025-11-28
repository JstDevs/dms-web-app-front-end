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
