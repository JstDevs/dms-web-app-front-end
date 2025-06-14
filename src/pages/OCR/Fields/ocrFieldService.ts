// src/services/ocrFieldService.ts
import axios from "@/api/axios";

export interface OCRField {
  ID: number;
  Field: string;
  updatedAt: string;
  createdAt: string;
}

export const fetchOCRFields = async (): Promise<OCRField[]> => {
  const response = await axios.get("/ocr/fields");
  return response.data.data;
};

export const createOCRField = async (
  fieldData: Omit<OCRField, "ID" | "createdAt" | "updatedAt">
): Promise<OCRField> => {
  const response = await axios.post("/ocr/fields", fieldData);
  return response.data;
};

export const updateOCRField = async (
  id: number,
  fieldData: Partial<OCRField>
): Promise<OCRField> => {
  const response = await axios.put(`/ocr/fields/${id}`, fieldData);
  return response.data;
};

export const deleteOCRField = async (id: number): Promise<void> => {
  await axios.delete(`/ocr/fields/${id}`);
};
