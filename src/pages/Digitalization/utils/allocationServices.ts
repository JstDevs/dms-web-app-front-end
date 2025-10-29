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
    // Debug: inspect raw payload shape
    // eslint-disable-next-line no-console
    console.log('fetchFieldsByLink response', response?.data);
    // Filter only active fields (Active === 1)
    let activeFields: Field[] = Array.isArray(response?.data?.data)
      ? response.data.data.filter((field: Field) => field.Active === 1)
      : [];

    // If empty, try alternate endpoint with query param pattern
    if (!activeFields.length) {
      // eslint-disable-next-line no-console
      console.log('fetchFieldsByLink: trying query param variant');
      const alt = await axios.get(`/fields/by-link`, { params: { linkId } });
      // eslint-disable-next-line no-console
      console.log('fetchFieldsByLink alt response', alt?.data);
      activeFields = Array.isArray(alt?.data?.data)
        ? alt.data.data.filter((field: Field) => field.Active === 1)
        : [];
    }
    // eslint-disable-next-line no-console
    console.log('fetchFieldsByLink activeFields', activeFields?.length);
    return activeFields;
  } catch (error) {
    console.error("Failed to fetch fields:", error);
    return [];
  }
};
