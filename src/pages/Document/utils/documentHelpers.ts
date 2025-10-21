import axios from "@/api/axios";

const buildDocumentFormData = (
  doc: Partial<DocumentUploadProp>,
  file: File | null,
  isNew: boolean,
  editId?: number,
  dynamicFields?: { [key: string]: any }
) => {
  const formData = new FormData();

  // File and ID handling
  if (file) formData.append("file", file);
  if (!isNew && editId !== undefined) formData.append("id", String(editId));

  // Core document fields
  formData.append("filename", doc.FileName || "");
  formData.append("FileDescription", doc.FileDescription || "");
  formData.append("Description", doc.Description || "");
  formData.append("remarks", doc.Remarks || "");

  // Date fields
  formData.append(
    "filedate",
    doc.FileDate ? new Date(doc.FileDate).toISOString().slice(0, 10) : ""
  );

  if (doc.Expiration && doc.ExpirationDate) {
    formData.append(
      "expdate",
      new Date(doc.ExpirationDate).toISOString().slice(0, 10)
    );
    formData.append("expiration", "true");
  } else {
    // formData.append("expdate", "");
    formData.append("expiration", "false");
  }

  // Department fields
  formData.append("dep", doc.DepartmentId?.toString() || "");
  formData.append("subdep", doc.SubDepartmentId?.toString() || "");

  // Boolean flags
  formData.append("confidential", String(doc.Confidential || false));
  formData.append("active", String(doc.Active || true));
  formData.append("publishing_status", String(doc.publishing_status || false));

  // Dynamic fields - append all text and date fields
  for (let i = 1; i <= 10; i++) {
    const textField = `Text${i}`;
    const dateField = `Date${i}`;
    
    if (doc[textField as keyof DocumentUploadProp]) {
      formData.append(textField.toLowerCase(), String(doc[textField as keyof DocumentUploadProp]));
    }
    
    if (doc[dateField as keyof DocumentUploadProp]) {
      const dateValue = doc[dateField as keyof DocumentUploadProp];
      if (dateValue) {
        formData.append(dateField.toLowerCase(), new Date(dateValue as string).toISOString().slice(0, 10));
      }
    }
  }

  // Add dynamic fields from field allocations
  if (dynamicFields) {
    Object.entries(dynamicFields).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, String(value));
      }
    });
  }

  return formData;
};

export interface DocumentUploadProp {
  ID: number;
  FileName: string;
  FileDescription: string;
  FileDate: string;
  Description: string;
  Remarks: string;
  DepartmentId: number;
  SubDepartmentId: number;
  Active: boolean;
  Confidential: boolean;
  Expiration: boolean;
  ExpirationDate: string;
  CreatedDate: string | null;
  Createdby: string | null;
  DataName: string | null;
  DataType: string;
  LinkID: string;
  PageCount: number | null;
  publishing_status: boolean;

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

const fetchDocumentAnalytics = async (documentId: string) => {
  try {
    const response = await axios.get(
      `/documents/documents/${documentId}/analytics`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching document analytics:", error);
    throw error;
  }
};

const getBase64FromBuffer = (bufferObj: { data: number[] }) => {
  const binary = Uint8Array.from(bufferObj.data).reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return `data:application/pdf;base64,${btoa(binary)}`;
};
export { buildDocumentFormData, fetchDocumentAnalytics, getBase64FromBuffer };
