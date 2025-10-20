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
  const response = await axios.post(
    '/batchupload/processexcelsheet',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
};

// For other file types - regular document upload
export const performDocumentUpload = async (
  formData: FormData
): Promise<any> => {
  const response = await axios.post(
    '/documents/create',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};
