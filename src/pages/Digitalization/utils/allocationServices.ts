import axios from "@/api/axios";

export interface OCRField {
  ID: number;
  Field: string;
  updatedAt: string;
  createdAt: string;
}

export interface Field {
  LinkID: number;
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