import axios from "@/api/axios";

export async function runOCR(id: number, payload: any) {
  const response = await axios.post(`/ocr/documents/${id}/ocr`, payload);
  return response.data;
}
