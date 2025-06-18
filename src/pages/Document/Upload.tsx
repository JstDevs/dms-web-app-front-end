import { DeleteDialog } from "@/components/ui/DeleteDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDepartmentOptions } from "@/hooks/useDepartmentOptions";
import { Button } from "@chakra-ui/react";
import {
  BookCheck,
  DeleteIcon,
  Edit,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  editDocument,
  fetchDocuments,
  uploadFile,
  deleteDocument,
} from "./utils/uploadAPIs";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildDocumentFormData,
  DocumentUploadProp,
} from "./utils/documentHelpers";
interface DocumentWrapper {
  newdoc: DocumentUploadProp;
  isRestricted: boolean;
  restrictions: any[]; // or define a proper type for restrictions
}
export default function DocumentUpload() {
  const [documents, setDocuments] = useState<DocumentWrapper[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const [newDoc, setNewDoc] = useState<Partial<DocumentUploadProp>>({
    FileName: "",
    FileDescription: "",
    DepartmentId: 0,
    SubDepartmentId: 0,
    FileDate: "",
    ExpirationDate: "",
    Confidential: false,
    Description: "",
    Remarks: "",
    Active: true,
    Expiration: false,
    publishing_status: false,
    // Initialize all text fields
    Text1: "",
    Text2: "",
    Text3: "",
    Text4: "",
    Text5: "",
    Text6: "",
    Text7: "",
    Text8: "",
    Text9: "",
    Text10: "",
    // Initialize all date fields
    Date1: null,
    Date2: null,
    Date3: null,
    Date4: null,
    Date5: null,
    Date6: null,
    Date7: null,
    Date8: null,
    Date9: null,
    Date10: null,
  });

  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const { selectedRole } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  const loadDocuments = async () => {
    try {
      const { data } = await fetchDocuments(
        Number(selectedRole?.ID),
        currentPage
      );
      setDocuments(data.documents);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };
  useEffect(() => {
    loadDocuments();
  }, [selectedRole, currentPage]);
  console.log({ documents });
  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setNewDoc((prev) => ({ ...prev, FileName: file.name }));
    }
  };

  const handleAddDocument = async () => {
    console.log({ newDoc, selectedFile });
    try {
      const formData = buildDocumentFormData(newDoc, selectedFile, true);
      console.log({ formData });
      const response = await uploadFile(formData);
      if (response.status) {
        toast.success("Document Added Successfully");
        await loadDocuments();
      }
    } catch (error) {
      console.error("Add document failed:", error);
      toast.error("Failed to add document");
    } finally {
      resetForm();
    }
  };

  const handleUpdateDocument = async () => {
    if (!editId) return;

    try {
      const formData = buildDocumentFormData(
        newDoc,
        selectedFile,
        false,
        editId
      );
      const response = await editDocument(formData);

      // setDocuments((prev) =>
      //   prev.map((doc) =>
      //     doc.newdoc.ID === editId ? { ...doc, ...response.data } : doc
      //   )
      // );
      if (response.status) {
        await loadDocuments();
        toast.success("Document Updated Successfully");
      }
    } catch (error) {
      console.error("Update document failed:", error);
      toast.error("Failed to update document");
    } finally {
      resetForm();
    }
  };

  const handleAddOrUpdate = async () => {
    const isDocumentNameExists = documents.some(
      (docWrapper: { newdoc: DocumentUploadProp }) => {
        const doc = docWrapper.newdoc;
        return (
          doc.FileName === newDoc.FileName && (!editId || doc.ID !== editId)
        );
      }
    );
    if (isDocumentNameExists) {
      toast.error("Document Name Already Exists");
      return;
    }

    if (editId) {
      await handleUpdateDocument();
    } else {
      await handleAddDocument();
    }
  };

  const resetForm = () => {
    setNewDoc({
      FileName: "",
      FileDescription: "",
      DepartmentId: 0,
      SubDepartmentId: 0,
      FileDate: "",
      ExpirationDate: "",
      Confidential: false,
      Description: "",
      Remarks: "",
      Active: true,
      Expiration: false,
      publishing_status: false,

      // Reset all text fields
      Text1: "",
      Text2: "",
      Text3: "",
      Text4: "",
      Text5: "",
      Text6: "",
      Text7: "",
      Text8: "",
      Text9: "",
      Text10: "",
      // Reset all date fields
      Date1: null,
      Date2: null,
      Date3: null,
      Date4: null,
      Date5: null,
      Date6: null,
      Date7: null,
      Date8: null,
      Date9: null,
      Date10: null,
    });
    setSelectedFile(null);
    setEditId(null);
  };

  const handleEdit = (id: number) => {
    const doc = documents.find((d) => d.newdoc.ID === id);
    if (doc) {
      setNewDoc(doc.newdoc);
      setEditId(id);
      setSelectedFile(null);
    }
  };
  console.log(newDoc);
  const handleDelete = async (id: number) => {
    try {
      await deleteDocument(id);
      toast.success("Document deleted successfully");
      setDocuments((prev) => prev.filter((d) => d.newdoc.ID !== id));
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    }
  };

  const filteredDocs = documents.filter((docWrapper) => {
    const doc = docWrapper.newdoc;
    return (
      (doc.FileName || "").toLowerCase().includes(search.toLowerCase()) ||
      (doc.FileDescription || doc.Description || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  const isFormValid = () => {
    const baseValidation =
      newDoc.DepartmentId &&
      newDoc.SubDepartmentId &&
      newDoc.FileDescription &&
      newDoc.FileDate &&
      newDoc.FileName;
    return editId ? baseValidation : baseValidation && selectedFile;
  };

  const handlePublish = async (docWrapper: DocumentWrapper) => {
    try {
      const doc = docWrapper.newdoc;
      // Create payload with publishing_status set to true
      const publishDoc = {
        ...doc,
        publishing_status: true,
      };

      const formData = buildDocumentFormData(publishDoc, null, false, doc.ID);
      const { status } = await editDocument(formData);

      if (!status) throw new Error("Failed to publish document");

      setDocuments((prev) =>
        prev.map((d) =>
          d.newdoc.ID === doc.ID
            ? { ...d, newdoc: { ...d.newdoc, publishing_status: true } }
            : d
        )
      );
      toast.success("Document published successfully");
    } catch (error) {
      console.error("Failed to publish document:", error);
      toast.error("Failed to publish document");
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-2 sm:p-6 space-y-6">
      {/* Header */}
      <header className="text-left">
        <h1 className="text-3xl font-bold text-blue-800">Upload</h1>
        <p className="mt-1 text-base text-gray-600">
          Upload files to the system for easy access and organization.
        </p>
      </header>

      {/* Form Section */}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 text-black">
          {/* Department */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Department *</label>
            <Select
              placeholder="Select a department"
              value={newDoc.DepartmentId?.toString() || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, DepartmentId: Number(e.target.value) })
              }
              options={departmentOptions}
            />
          </div>

          {/* Sub-Department */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Sub-Department *</label>
            <Select
              placeholder="Select a sub-department"
              value={newDoc.SubDepartmentId?.toString() || ""}
              onChange={(e) =>
                setNewDoc({
                  ...newDoc,
                  SubDepartmentId: Number(e.target.value),
                })
              }
              options={subDepartmentOptions}
            />
          </div>

          {/* File Description */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">File Description *</label>
            <Input
              className="w-full"
              value={newDoc.FileDescription || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, FileDescription: e.target.value })
              }
              required
              placeholder="Enter file description"
            />
          </div>

          {/* File Date */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">File Date *</label>
            <Input
              type="date"
              className="w-full"
              value={newDoc.FileDate || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, FileDate: e.target.value })
              }
              required
              placeholder="Enter file date"
            />
          </div>

          {/* File Name */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">File Name *</label>
            <Input
              className="w-full"
              value={newDoc.FileName || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, FileName: e.target.value })
              }
              required
              placeholder="Enter file name"
            />
          </div>

          {/* Description */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Description</label>
            <Input
              className="w-full"
              value={newDoc.Description || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Description: e.target.value })
              }
              placeholder="Enter description"
            />
          </div>
          {/* Remarks */}
          <div className="col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base">Remarks</label>
            <textarea
              className="w-full border rounded p-2 text-sm sm:text-base"
              rows={3}
              value={newDoc.Remarks || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Remarks: e.target.value })
              }
              placeholder="Enter remarks"
            ></textarea>
          </div>

          {/* Attachment */}
          {editId ? null : (
            <div className="col-span-1 sm:col-span-2">
              <label className="text-sm sm:text-base">Attachment *</label>
              <div className="mt-1">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedFile
                        ? selectedFile.name
                        : "PDF, DOCX, XLSX up to 10MB"}
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleAttach}
                    required
                  />
                </label>
              </div>
              {selectedFile && (
                <div className="flex items-center mt-2">
                  <span className="text-sm text-blue-600">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Confidential Checkbox */}
          <div className="col-span-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={newDoc.Confidential || false}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Confidential: e.target.checked })
              }
              id="confidential"
              className="h-4 w-4"
            />
            <label
              className="text-sm sm:text-base cursor-pointer"
              htmlFor="confidential"
            >
              Confidential
            </label>
          </div>

          {/* Active Checkbox */}
          {/* <div className="col-span-1 flex items-center gap-2 ">
            <input
              type="checkbox"
              checked={newDoc.Active || true}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Active: e.target.checked })
              }
              id="active"
              className="h-4 w-4"
            />
            <label
              className="text-sm sm:text-base cursor-pointer"
              htmlFor="active"
            >
              Active
            </label>
          </div> */}
          {/* Expiration Checkbox */}
          <div className="col-span-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={newDoc.Expiration || false}
              onChange={(e) =>
                setNewDoc({ ...newDoc, Expiration: e.target.checked })
              }
              id="expiration"
              className="h-4 w-4"
            />
            <label
              className="text-sm sm:text-base cursor-pointer"
              htmlFor="expiration"
            >
              Has Expiration
            </label>
          </div>

          {/* Expiration Date - Conditionally rendered */}
          {newDoc.Expiration && (
            <div className="col-span-1">
              <label className="text-sm sm:text-base">Expiration Date *</label>
              <Input
                type="date"
                className="w-full"
                value={newDoc.ExpirationDate || ""}
                onChange={(e) =>
                  setNewDoc({ ...newDoc, ExpirationDate: e.target.value })
                }
                required={newDoc.Expiration}
                placeholder="Enter expiration date"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleAddOrUpdate}
            className="w-full sm:w-2/3 md:w-1/3 px-2 bg-blue-600 text-white hover:bg-blue-700"
            disabled={!isFormValid()}
          >
            {editId ? "Update" : "Add"} Document
          </Button>
        </div>
      </div>

      {/* Document List Section */}
      <div className="space-y-4">
        {/* Search and Title */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-lg font-semibold w-full sm:w-auto">
            Document List
          </h2>
          <Input
            className="w-full sm:w-1/2"
            placeholder="Search by Name or Description"
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredDocs.length === 0 ? (
          <p className="text-gray-600 text-center py-6 text-base sm:text-lg font-semibold">
            No documents found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm border mt-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider  whitespace-nowrap">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    File Date
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Expiration Date
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Department Id
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Sub-Department Id
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Confidential
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Active
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-6 py-3 text-base font-semibold text-gray-700 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((docWrapper) => {
                  const doc = docWrapper.newdoc;
                  return (
                    <tr key={doc.ID}>
                      <td className="border px-6 py-3">{doc.ID}</td>
                      <td className="border px-6 py-3">{doc.FileName}</td>
                      <td className="border px-6 py-3">
                        {doc.Description || "-"}
                      </td>
                      <td className="border px-6 py-3">{doc.Remarks || "-"}</td>
                      <td className="border px-6 py-3">
                        {doc.FileDate
                          ? new Date(doc.FileDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="border px-6 py-3">
                        {doc.Expiration
                          ? new Date(doc.ExpirationDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="border px-6 py-3">{doc.DepartmentId}</td>
                      <td className="border px-6 py-3">
                        {doc.SubDepartmentId}
                      </td>
                      <td className="border px-6 py-3">
                        {doc.Confidential ? "Yes" : "No"}
                      </td>
                      <td className="border px-6 py-3">
                        {doc.Active ? "Yes" : "No"}
                      </td>
                      <td className="border px-6 py-3">
                        {doc.publishing_status ? (
                          <span className="text-gray-900">Published</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(docWrapper)}
                            className="w-full sm:flex-1 text-green-600 hover:text-green-800"
                          >
                            <UploadCloud className="h-4 w-4" />
                            Publish
                          </Button>
                        )}
                      </td>
                      <td className="border px-6 py-3">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(doc.ID)}
                            className="w-full sm:flex-1 text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <DeleteDialog onConfirm={() => handleDelete(doc.ID)}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full sm:flex-1 text-red-600 hover:text-red-700 "
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </DeleteDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
