import axios from '@/api/axios';

export interface OCRField {
  ID: number;
  Field: string;
  updatedAt: string;
  createdAt: string;
}

// For Excel files - batch processing
export const performBatchUpload = async (
  formData: FormData
): Promise<OCRField[]> => {
  // Don't set Content-Type manually - axios will automatically set it with boundary for FormData
  const response = await axios.post(
    '/batchupload/processexcelsheet',
    formData
  );
  return response.data.data;
};

// For other file types - regular document upload
export const performDocumentUpload = async (
  formData: FormData
): Promise<any> => {
  // Don't set Content-Type manually - axios will automatically set it with boundary for FormData
  const response = await axios.post(
    '/documents/create',
    formData
  );
  return response.data;
};
