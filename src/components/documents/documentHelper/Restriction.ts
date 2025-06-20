import axios from "@/api/axios";
interface RestrictionPayload {
  Field: string; // Only if needed
  LinkID: string;
  UserID: number;
  UserRole: number;
  Reason: string;
}
export const fetchRestrictions = async () => {
  try {
    const response = await axios.get("/documents/restrictions");
    return response.data;
  } catch (error) {
    console.error("Error fetching restrictions:", error);
    throw error;
  }
};
export const fetchDocumentRestrictions = async (documentId: string) => {
  try {
    const response = await axios.get(
      `/documents/documents/${documentId}/restrictions`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching document restrictions:", error);
    throw error;
  }
};
export const removeRestrictedFields = async (
  documentId: string,
  restrictionId: string
) => {
  try {
    const response = await axios.delete(
      `/documents/documents/${documentId}/restrictions/${restrictionId}`,
      {}
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching restrictions:", error);
    throw error;
  }
};
export const restrictFields = async (
  documentId: string,
  payload: RestrictionPayload
) => {
  try {
    const response = await axios.post(
      `/documents/documents/${documentId}/restrictions`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching restrictions:", error);
    throw error;
  }
};
