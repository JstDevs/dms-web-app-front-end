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
    // Filter only active fields (Active === 1)
    const activeFields = response.data.data.filter(
      (field: Field) => field.Active === 1
    );
    return activeFields;
  } catch (error) {
    console.error("Failed to fetch fields:", error);
    return [];
  }
};
