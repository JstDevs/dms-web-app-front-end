import { useState } from "react";
import axios from "@/api/axios";

export interface UnrecordedDocument {
  ID: number;
  FileName: string;
  FileDescription: string;
  FileDate: string;
  ExpirationDate: string;
  Description: string;
  Remarks: string;
  Active: boolean;
  Confidential: boolean;
  CreatedDate: string;
  Createdby: string;
  DepartmentId: number;
  SubDepartmentId: number;
  LinkID: string;
  publishing_status: boolean;
  Expiration: boolean;
  DataType: "pdf" | "image" | string;
  DataName: string | null;
  DataImage: {
    type: "Buffer";
    data: number[];
  };
  PageCount: number | null;
  Text1: string;
  Text2: string;
  Text3: string;
  Text4: string;
  Text5: string;
  Text6: string;
  Text7: string;
  Text8: string;
  Text9: string;
  Text10: string;
  Date1: string | null;
  Date2: string | null;
  Date3: string | null;
  Date4: string | null;
  Date5: string | null;
  Date6: string | null;
  Date7: string | null;
  Date8: string | null;
  Date9: string | null;
  Date10: string | null;
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
