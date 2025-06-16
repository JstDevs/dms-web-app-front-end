const buildDocumentFormData = (
  doc: any,
  file: File | null,
  isNew: boolean,
  editId?: string
) => {
  const formData = new FormData();

  if (file) formData.append("file", file);
  if (!isNew && editId !== undefined) formData.append("id", editId);

  formData.append("filename", doc.name || "");
  formData.append("FileDescription", doc.fileDescription || "");
  formData.append("Description", doc.description || "");

  formData.append(
    "filedate",
    doc.fileDate ? new Date(doc.fileDate).toISOString().slice(0, 10) : ""
  );

  formData.append(
    "expdate",
    doc.expirationDate
      ? new Date(doc.expirationDate).toISOString().slice(0, 10)
      : ""
  );

  if (doc.expirationDate) {
    formData.append("expiration", "true");
  }

  formData.append("dep", doc.department || "");
  formData.append("subdep", doc.subdepartment || "");

  formData.append("confidential", String(doc.confidential || false));
  formData.append("publishing_status", "false"); // always false initially
  formData.append("remarks", doc.remarks || "");

  return formData;
};

export { buildDocumentFormData };
