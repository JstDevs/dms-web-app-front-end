import { useState } from "react";
import axios from "@/api/axios";

export interface UnrecordedDocument {
  ID: number;
  FileName: string;
  filePath: string;
  // Add additional fields as per API
}

export function useUnrecordedDocuments() {
  const [documents, setDocuments] = useState<UnrecordedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnrecorded = async (
    departmentId: string,
    subDepartmentId: string,
    userId: string
  ) => {
    setLoading(true);
    setError(null);
    console.log({ departmentId, subDepartmentId, userId });
    try {
      const response = await axios.get(
        `/ocr/documents/unrecorded/${departmentId}/${subDepartmentId}/${userId}`
      );
      console.log({ response });
      setDocuments(response.data.data.documentswithocrreadfields);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  return {
    unrecordedDocuments: documents,
    loading,
    error,
    fetchUnrecorded, // ✅ make sure this is returned
  };
}
