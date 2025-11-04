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
  } catch (error) {
    console.error('Failed to fetch field allocations:', error);
    // Return empty data if API fails - this allows the system to work without field allocations
    return {
      fields: [],
      userPermissions: {
        View: true,
        Add: true,
        Edit: true,
        Delete: true,
        Print: true,
        Confidential: true,
      },
    };
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
