import { DeleteDialog } from "@/components/ui/DeleteDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useDepartmentOptions } from "@/hooks/useDepartmentOptions";
import { Button } from "@chakra-ui/react";
import {
  BookCheck,
  DeleteIcon,
  Edit,
  Scissors,
  Search,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
// import { useDispatch, useSelector } from "react-redux";

interface Document {
  id: string;
  department: string;
  subdepartment: string;
  fileDescription: string;
  fileDate: string;
  name: string;
  description: string;
  expirationDate?: string;
  confidential: boolean;
  remarks: string;
  fileName?: string;
}

export default function DocumentUpload() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState<Partial<Document>>({
    department: "",
    subdepartment: "",
    fileDate: new Date().toISOString().split("T")[0],
    expirationDate: new Date().toISOString().split("T")[0],
    confidential: false,
  });
  // ----------REDUX STATE---------------
  // const dispatch = useDispatch<AppDispatch>();
  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setNewDoc((prev) => ({ ...prev, fileName: file.name }));
    }
  };

  const handleAddOrUpdate = () => {
    if (!newDoc.name || !newDoc.fileDescription) {
      toast.error("Enter All Required Fields ");
      return;
    }
    // Check if document name already exists (excluding current document if editing)
    const isDocumentNameExists = documents.some(
      (doc) => doc.name === newDoc.name && (!editId || doc.id !== editId)
    );
    if (isDocumentNameExists) {
      toast.error("Document Name Already Exists");
      return;
    }
    if (editId) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === editId ? ({ ...doc, ...newDoc } as Document) : doc
        )
      );
    } else {
      setDocuments([
        ...documents,
        {
          ...newDoc,
          id: `doc-${Date.now()}`,
          remarks: newDoc.remarks || "",
        } as Document,
      ]);
    }
    setNewDoc({
      department: "",
      subdepartment: "",
      confidential: false,
    });
    setSelectedFile(null);
    setEditId(null);
  };

  const handleEdit = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      setNewDoc(doc);
      setEditId(id);
      setSelectedFile(null);
    }
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const filteredDocs = documents?.filter(
    (doc) =>
      doc?.name?.toLowerCase().includes(search.toLowerCase()) ||
      doc?.description?.toLowerCase().includes(search.toLowerCase())
  );
  // Add this function to check if all required fields are filled
  const isFormValid = () => {
    const baseValidation =
      newDoc.department &&
      newDoc.subdepartment &&
      newDoc.fileDescription &&
      newDoc.fileDate &&
      newDoc.name;
    // Require file only when adding new document, not when editing
    return editId ? baseValidation : baseValidation && selectedFile;
  };
  console.log(newDoc);
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
              value={newDoc.department}
              onChange={(e) =>
                setNewDoc({ ...newDoc, department: e.target.value })
              }
              options={departmentOptions}
            />
          </div>

          {/* Sub-Department */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Sub-Department *</label>
            <Select
              placeholder="Select a sub-department"
              value={newDoc.subdepartment}
              onChange={(e) =>
                setNewDoc({ ...newDoc, subdepartment: e.target.value })
              }
              options={subDepartmentOptions}
            />
          </div>

          {/* File Description */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">File Description *</label>
            <Input
              className="w-full"
              value={newDoc.fileDescription || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, fileDescription: e.target.value })
              }
              required
            />
          </div>

          {/* File Date */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">File Date *</label>
            <Input
              type="date"
              className="w-full"
              value={newDoc.fileDate || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, fileDate: e.target.value })
              }
              required
            />
          </div>

          {/* Name */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Name *</label>
            <Input
              className="w-full"
              value={newDoc.name || ""}
              onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Description</label>
            <Input
              className="w-full"
              value={newDoc.description || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, description: e.target.value })
              }
              required
            />
          </div>

          {/* Expiration Date */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Expiration Date</label>
            <Input
              type="date"
              className="w-full"
              value={newDoc.expirationDate || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, expirationDate: e.target.value })
              }
              required
            />
          </div>

          {/* Confidential Checkbox */}
          <div className="col-span-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={newDoc.confidential}
              onChange={(e) =>
                setNewDoc({ ...newDoc, confidential: e.target.checked })
              }
              className="h-4 w-4"
            />
            <label className="text-sm sm:text-base">Confidential</label>
          </div>

          {/* Remarks */}
          <div className="col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base">Remarks</label>
            <textarea
              className="w-full border rounded p-2 text-sm sm:text-base"
              rows={3}
              value={newDoc.remarks || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, remarks: e.target.value })
              }
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
                    onClick={() => {
                      setSelectedFile(null);
                      // If you're using the key approach to reset:
                      // setFileInputKey(Date.now());
                    }}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleAddOrUpdate}
            className="w-full sm:w-2/3 md:w-1/3 px-2 bg-blue-600 text-white hover:bg-blue-700"
            disabled={!isFormValid()} // disable button if form is not valid
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
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider table-cell">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider table-cell">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                    File Date
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider table-cell">
                    Attachment
                  </th>
                  <th className="px-6 py-3  text-base font-semibold text-gray-700 uppercase tracking-wider text-left">
                    Actions
                  </th>
                  <th className="px-6 py-3  text-base font-semibold text-gray-700 uppercase tracking-wider text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="border px-6 py-3">{doc.id}</td>
                    <td className="border px-6 py-3 table-cell">{doc.name}</td>
                    <td className="border px-6 py-3 table-cell">
                      {doc.description}
                    </td>
                    <td className="border px-6 py-3">{doc.fileDate || "-"}</td>
                    <td className="border px-6 py-3 table-cell">
                      {doc.fileName || "-"}
                    </td>
                    <td className="border px-6 py-3 ">
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(doc.id)}
                          className="w-full sm:flex-1 text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <DeleteDialog
                          key={doc.id}
                          onConfirm={() => handleDelete(doc.id)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full sm:flex-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </DeleteDialog>
                      </div>
                    </td>
                    <td className="border px-6 py-3 ">
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:flex-1 text-gray-600 hover:text-gray-900"
                        >
                          <Scissors className="h-4 w-4" />
                          Draft
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full sm:flex-1 text-green-600 hover:text-green-700"
                        >
                          <BookCheck className="h-4 w-4" />
                          Publish
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
