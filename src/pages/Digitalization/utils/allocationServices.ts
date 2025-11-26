import axios from "@/api/axios";

export interface OCRField {
  ID: number;
  Field: string;
  updatedAt: string;
  createdAt: string;
}

export interface Field {
  LinkID: number;
  FieldID?: number; // Link to OCRavailableFields.ID (master field)
  FieldNumber: number;
  Active: number;
  Description: string;
  DataType: string;
}

export const allocateFieldsToUsers = async (
  payload: any
): Promise<OCRField[]> => {
  const response = await axios.post("/allocation/add-user", payload);
  return response.data.data;
};

/**
 * Update existing DocumentAccess allocation
 */
export const updateAllocation = async (
  allocationId: number,
  payload: any
): Promise<OCRField[]> => {
  const response = await axios.put(`/allocation/update/${allocationId}`, payload);
  return response.data.data;
};

export const fetchFieldsByLink = async (
  linkId: number
): Promise<Field[]> => {
  try {
    const response = await axios.get(`/fields/by-link/${linkId}`);
    // Return all fields; consumers will normalize Active values
    if (Array.isArray(response?.data?.data)) return response.data.data as Field[];

    // Fallback alternate endpoint with query param pattern
    const alt = await axios.get(`/fields/by-link`, { params: { linkId } });
    if (Array.isArray(alt?.data?.data)) return alt.data.data as Field[];
    return [];
  } catch (error) {
    console.error("Failed to fetch fields:", error);
    return [];
  }
};

export type UpsertFieldItem = {
  FieldID?: number; // Link to OCRavailableFields.ID (master field)
  FieldNumber: number;
  Active: boolean | number | string;
  Description?: string | null;
  DataType?: string; // 'Text' | 'Date'
};

export const updateFieldsByLink = async (
  linkId: number,
  fields: UpsertFieldItem[],
  options?: { deactivateMissing?: boolean }
) => {
  try {
    const response = await axios.put(`/fields/by-link/${linkId}`,
      {
        fields,
        deactivateMissing: options?.deactivateMissing === true,
      }
    );
    return response?.data?.data ?? [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to update fields by link:', error);
    throw error;
  }
};

export interface DocumentAccess {
  id: number;
  LinkID: number;
  UserID: number;
  View: number;
  Add: number;
  Edit: number;
  Delete: number;
  Print: number;
  Confidential: number;
  Comment: number;
  Collaborate: number;
  Finalize: number;
  Masking: number;
  Active: number;
  CreatedBy: string;
  CreatedDate: string;
  fields: Array<{
    ID: number;
    Field: string;
    Type: string;
    Description: string;
  }>;
}

/**
 * Fetch all DocumentAccess allocations for a specific LinkID (subDepartmentId)
 * LinkID can be a number or a string (handles large numbers in scientific notation)
 */
export const fetchAllocationsByLink = async (
  linkId: number | string
): Promise<DocumentAccess[]> => {
  try {
    // Convert to string to handle large numbers properly
    const linkIdStr = String(linkId);
    console.log('Fetching allocations for LinkID:', linkIdStr); // Debug log
    
    // Try multiple formats in case backend expects different format
    let response;
    try {
      response = await axios.get(`/allocation/by-link/${linkIdStr}`);
    } catch (err: any) {
      // If string format fails, try as number
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        console.log('Trying LinkID as number format...');
        try {
          response = await axios.get(`/allocation/by-link/${Number(linkId)}`);
        } catch (err2) {
          // Try with query parameter format
          response = await axios.get(`/allocation/by-link`, { 
            params: { linkId: linkIdStr } 
          });
        }
      } else {
        throw err;
      }
    }
    
    const allocations = response?.data?.data ?? [];
    console.log('Fetched allocations:', allocations); // Debug log
    
    // Parse fields if they come as JSON string from database
    return allocations.map((alloc: any) => {
      if (alloc.fields) {
        // If fields is already an array, use it as is
        if (Array.isArray(alloc.fields)) {
          return alloc;
        }
        // If fields is a JSON string, parse it
        if (typeof alloc.fields === 'string') {
          try {
            alloc.fields = JSON.parse(alloc.fields);
          } catch (e) {
            console.error('Failed to parse fields JSON:', e);
            alloc.fields = [];
          }
        }
      } else {
        alloc.fields = [];
      }
      return alloc;
    });
  } catch (error) {
    console.error('Failed to fetch allocations by link:', error);
    // Return empty array if not found (404) or other errors
    return [];
  }
};

/**
 * Fetch all allocations - gets everything and filters client-side
 * This ensures we get ALL allocations for the department/subdepartment
 */
export const fetchAllAllocations = async (): Promise<DocumentAccess[]> => {
  try {
    console.log('Fetching ALL allocations...');
    const response = await axios.get(`/allocation/all`);
    const allocations = response?.data?.data ?? [];
    
    // Parse fields if they come as JSON string from database
    return allocations.map((alloc: any) => {
      if (alloc.fields) {
        if (Array.isArray(alloc.fields)) {
          return alloc;
        }
        if (typeof alloc.fields === 'string') {
          try {
            alloc.fields = JSON.parse(alloc.fields);
          } catch (e) {
            console.error('Failed to parse fields JSON:', e);
            alloc.fields = [];
          }
        }
      } else {
        alloc.fields = [];
      }
      return alloc;
    });
  } catch (error) {
    console.error('Failed to fetch all allocations:', error);
    return [];
  }
};

/**
 * Fetch all allocations by department and subdepartment
 * This is the primary method since LinkID might not match subdepartment ID
 */
export const fetchAllocationsByDept = async (
  deptId: number | string,
  subDeptId: number | string
): Promise<DocumentAccess[]> => {
  try {
    console.log('Fetching allocations by dept:', deptId, 'subdept:', subDeptId);
    
    // Try different endpoint formats
    let response;
    let allocations: any[] = [];
    
    try {
      // Try endpoint with both dept and subdept
      response = await axios.get(`/allocation/by-dept/${deptId}/${subDeptId}`);
      allocations = response?.data?.data ?? [];
      console.log(`Fetched ${allocations.length} allocations from /allocation/by-dept/${deptId}/${subDeptId}`);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        // Try with query parameters
        try {
          response = await axios.get(`/allocation/by-dept`, { 
            params: { deptId, subDeptId } 
          });
          allocations = response?.data?.data ?? [];
          console.log(`Fetched ${allocations.length} allocations from /allocation/by-dept with params`);
        } catch (err2: any) {
          // Try alternative endpoint format
          try {
            response = await axios.get(`/allocation`, { 
              params: { departmentId: deptId, subDepartmentId: subDeptId } 
            });
            allocations = response?.data?.data ?? [];
            console.log(`Fetched ${allocations.length} allocations from /allocation with params`);
          } catch (err3) {
            console.error('All endpoint formats failed, trying to fetch all allocations:', err3);
            // Last resort: fetch all and filter client-side
            const allAllocs = await fetchAllAllocations();
            // Filter by matching LinkID pattern or other criteria
            // Since we can't match LinkID exactly, we'll return all and let the frontend handle it
            allocations = allAllocs;
            console.log(`Fetched ${allocations.length} total allocations, will filter client-side`);
          }
        }
      } else {
        throw err;
      }
    }
    
    console.log('Fetched allocations by dept:', allocations);
    console.log('Allocations UserIDs:', allocations.map((a: any) => a.UserID));
    
    // Parse fields if they come as JSON string from database
    return allocations.map((alloc: any) => {
      if (alloc.fields) {
        if (Array.isArray(alloc.fields)) {
          return alloc;
        }
        if (typeof alloc.fields === 'string') {
          try {
            alloc.fields = JSON.parse(alloc.fields);
          } catch (e) {
            console.error('Failed to parse fields JSON:', e);
            alloc.fields = [];
          }
        }
      } else {
        alloc.fields = [];
      }
      return alloc;
    });
  } catch (error) {
    console.error('Failed to fetch allocations by dept:', error);
    return [];
  }
};

/**
 * Fetch allocation by user, department, and subdepartment
 * Used as fallback when fetchAllocationsByLink returns empty
 */
export const fetchAllocationByUserAndDept = async (
  userId: number,
  deptId: number,
  subDeptId: number | string
): Promise<DocumentAccess | null> => {
  try {
    const response = await axios.get(`/allocation/user/${userId}/${deptId}/${subDeptId}`);
    const allocation = response?.data?.data;
    if (allocation) {
      // Parse fields if needed
      if (allocation.fields && typeof allocation.fields === 'string') {
        try {
          allocation.fields = JSON.parse(allocation.fields);
        } catch (e) {
          allocation.fields = [];
        }
      }
      return allocation;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch allocation by user and dept:', error);
    return null;
  }
};