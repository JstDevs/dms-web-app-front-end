// import axios from "@/api/axios";
// interface RestrictionPayload {
//   Field: string; // Only if needed
//   LinkID: string;
//   UserID: number;
//   UserRole: number;
//   Reason: string;
// }
// export const fetchRestrictions = async () => {
//   try {
//     const response = await axios.get("/documents/restrictions");
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching restrictions:", error);
//     throw error;
//   }
// };
// export const fetchDocumentRestrictions = async (documentId: string) => {
//   try {
//     const response = await axios.get(
//       `/documents/documents/${documentId}/restrictions`
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching document restrictions:", error);
//     throw error;
//   }
// };
// export const removeRestrictedFields = async (
//   documentId: string,
//   restrictionId: string
// ) => {
//   try {
//     const response = await axios.delete(
//       `/documents/documents/${documentId}/restrictions/${restrictionId}`,
//       {}
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching restrictions:", error);
//     throw error;
//   }
// };
// export const restrictFields = async (
//   documentId: string,
//   payload: RestrictionPayload
// ) => {
//   try {
//     const response = await axios.post(
//       `/documents/documents/${documentId}/restrictions`,
//       payload
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching restrictions:", error);
//     throw error;
//   }
// };
// import api from '@/config/axios';
import axios from '@/api/axios';
export interface NewRestrictionPayload {
  Field: string;
  Reason: string;
  UserID: number;
  UserRole: number;
  restrictedType: 'field' | 'open';
  xaxis: number;
  yaxis: number;
  width: number;
  height: number;
  pageNumber?: number;
}

export interface NewRestrictionResponse {
  ID: number;
  DocumentID: number;
  Field: string;
  Reason: string;
  UserID: number;
  UserRole: number;
  restrictedType: 'field' | 'open';
  xaxis: number;
  yaxis: number;
  width: number;
  height: number;
  pageNumber?: number;
  CreatedBy: string;
  CreatedDate: string;
}

export const restrictFields = async (
  documentId: string,
  payload: NewRestrictionPayload
): Promise<{
  success: boolean;
  data?: NewRestrictionResponse;
  message?: string;
}> => {
  try {
    console.log('Sending restriction payload to API:', {
      documentId,
      payload,
      pageNumber: payload.pageNumber,
      pageNumberType: typeof payload.pageNumber
    });
    const response = await axios.post(
      `/documents/documents/${documentId}/restrictions_new`,
      payload
    );
    console.log('API response after saving restriction:', {
      responseData: response.data,
      pageNumberInResponse: response.data?.pageNumber ?? response.data?.PageNumber ?? response.data?.page_number,
      allFields: Object.keys(response.data || {}),
      fullResponseData: JSON.stringify(response.data, null, 2)
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Failed to add restriction:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      fullError: JSON.stringify(error.response?.data || error.message, null, 2)
    });
    return {
      success: false,
      message: error.response?.data?.message 
        || error.response?.data?.error 
        || error.response?.data?.Error
        || `Failed to add restriction: ${error.response?.statusText || error.message}`,
    };
  }
};

export const removeRestrictedFields = async (
  documentId: string,
  restrictionId: string,
  departmentId?: number | null,
  subDepartmentId?: number | null
): Promise<{ success: boolean; message?: string }> => {
  try {
    const params: Record<string, string> = {};
    
    // Add query parameters if provided
    if (departmentId !== undefined && departmentId !== null) {
      params.department = String(departmentId);
      params.appliedDepartment = String(departmentId);
    }
    
    if (subDepartmentId !== undefined && subDepartmentId !== null) {
      params.subDepartment = String(subDepartmentId);
      params.appliedSubDepartment = String(subDepartmentId);
    }
    
    const queryString = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    await axios.delete(
      `/documents/documents/${documentId}/restrictions/${restrictionId}${queryString}`
    );
    return { success: true };
  } catch (error: any) {
    console.error('Failed to remove restriction:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to remove restriction',
    };
  }
};

export const fetchDocumentRestrictions = async (
  documentId: string
): Promise<{
  success: boolean;
  data?: NewRestrictionResponse[];
  message?: string;
  statusCode?: number;
}> => {
  try {
    const response = await axios.get(
      `/documents/documents/${documentId}/restrictions`
    );
    console.log({ ddtata: response.data.data });
    return { success: true, data: response.data.data, statusCode: response.status };
  } catch (error: any) {
    console.error('Failed to fetch restrictions:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch restrictions',
      statusCode: error.response?.status,
    };
  }
};
