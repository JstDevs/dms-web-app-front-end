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
    const response = await axios.post(
      `/documents/documents/${documentId}/restrictions_new`,
      payload
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Failed to add restriction:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to add restriction',
    };
  }
};

export const removeRestrictedFields = async (
  documentId: string,
  restrictionId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    await axios.delete(
      `/documents/documents/${documentId}/restrictions/${restrictionId}`
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
}> => {
  try {
    const response = await axios.get(
      `/documents/documents/${documentId}/restrictions`
    );
    console.log({ ddtata: response.data.data });
    return { success: true, data: response.data.data };
  } catch (error: any) {
    console.error('Failed to fetch restrictions:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch restrictions',
    };
  }
};
