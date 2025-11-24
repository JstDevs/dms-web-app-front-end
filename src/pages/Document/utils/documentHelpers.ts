import axios from "@/api/axios";

const buildDocumentFormData = (
  doc: Partial<DocumentUploadProp>,
  file: File | null,
  isNew: boolean,
  editId?: number,
  dynamicFields?: { [key: string]: any },
  isMinorVersion?: boolean,
  finalize?: boolean
) => {
  const formData = new FormData();

  // File and ID handling
  if (file) formData.append("file", file);
  if (!isNew && editId !== undefined) formData.append("id", String(editId));
  
  // Version control flags - backend expects string 'true'/'false' or boolean
  if (isMinorVersion !== undefined) {
    formData.append("isMinorVersion", String(isMinorVersion));
  }
  if (finalize !== undefined) {
    formData.append("finalize", String(finalize));
  }

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

  // Dynamic fields - append all text and date fields from doc object
  // Backend expects uppercase: Text1, Text2, Date1, Date2, etc.
  // Track which fields we've already appended to avoid duplicates
  const appendedFields = new Set<string>();
  
  for (let i = 1; i <= 10; i++) {
    const textField = `Text${i}`;
    const dateField = `Date${i}`;
    
    if (doc[textField as keyof DocumentUploadProp]) {
      // Backend expects uppercase format: Text1, Text2, etc.
      const value = doc[textField as keyof DocumentUploadProp];
      if (value && !appendedFields.has(textField)) {
        formData.append(textField, String(value));
        appendedFields.add(textField);
      }
    }
    
    if (doc[dateField as keyof DocumentUploadProp]) {
      const dateValue = doc[dateField as keyof DocumentUploadProp];
      if (dateValue && !appendedFields.has(dateField)) {
        // Backend expects uppercase format: Date1, Date2, etc.
        formData.append(dateField, new Date(dateValue as string).toISOString().slice(0, 10));
        appendedFields.add(dateField);
      }
    }
  }

  // Add dynamic fields from field allocations ONLY if they weren't already in doc object
  // Convert lowercase keys (text1, date1) to uppercase (Text1, Date1) for backend
  if (dynamicFields) {
    Object.entries(dynamicFields).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // Convert lowercase to uppercase: text1 -> Text1, date1 -> Date1
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
        // Only append if we haven't already appended this field from doc object
        if (!appendedFields.has(formattedKey)) {
          formData.append(formattedKey, String(value));
          appendedFields.add(formattedKey);
        }
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

  FieldText1: string;
  FieldText2: string;
  FieldText3: string;
  FieldText4: string;
  FieldText5: string;
  FieldText6: string;
  FieldText7: string;
  FieldText8: string;
  FieldText9: string;
  FieldText10: string;

  FieldDate1: string;
  FieldDate2: string;
  FieldDate3: string;
  FieldDate4: string;
  FieldDate5: string;
  FieldDate6: string;
  FieldDate7: string;
  FieldDate8: string;
  FieldDate9: string;
  FieldDate10: string;

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
    // Interceptor handles 403 by returning success: false, so check for that
    if (response.data?.success === false) {
      // 403 error was handled by interceptor, return null
      return null;
    }
    return response.data;
  } catch (error: any) {
    // This catch block should rarely execute for 403 errors since interceptor handles them
    // But keep it as a fallback for other errors
    if (error?.response?.status === 403) {
      // Return null for 403 - expected for new users/departments without Collaborate permission
      return null;
    }
    // Only log and throw non-403 errors
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
