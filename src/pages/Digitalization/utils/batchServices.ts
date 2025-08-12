import axios from '@/api/axios';

export interface OCRField {
  ID: number;
  Field: string;
  updatedAt: string;
  createdAt: string;
}

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
