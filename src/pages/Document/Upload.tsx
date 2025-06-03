// import { Button } from "@/components/ui/Button";
// import { Card, CardContent } from "@/components/ui/Card";
import { DeleteDialog } from "@/components/ui/DeleteDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@chakra-ui/react";
import { Search } from "lucide-react";
import React, { useState } from "react";

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

const dummyDepartments = [
  { value: "finance", label: "Finance" },
  { value: "payroll", label: "Payroll" },
  { value: "hr", label: "HR" },
];

const dummySubdepartments = [
  { value: "teamA", label: "Team A" },
  { value: "teamB", label: "Team B" },
  { value: "teamC", label: "Team C" },
];

export default function DocumentUpload() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState<Partial<Document>>({
    department: "Main Office",
    subdepartment: "Sub Office",
    fileDate: new Date().toISOString().split("T")[0],
    expirationDate: new Date().toISOString().split("T")[0],
    confidential: false,
  });

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setNewDoc((prev) => ({ ...prev, fileName: file.name }));
    }
  };

  const handleAddOrUpdate = () => {
    if (!newDoc.name || !newDoc.fileDescription) return;
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
      department: "Main Office",
      subdepartment: "Sub Office",
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
    }
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const filteredDocs = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.description.toLowerCase().includes(search.toLowerCase())
  );

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
            <Select
              label="Department"
              value={newDoc.department}
              onChange={(e) =>
                setNewDoc({ ...newDoc, department: e.target.value })
              }
              options={dummyDepartments}
            />
          </div>

          {/* Sub-Department */}
          <div className="col-span-1">
            <Select
              label="Sub-Department"
              value={newDoc.subdepartment}
              onChange={(e) =>
                setNewDoc({ ...newDoc, subdepartment: e.target.value })
              }
              options={dummySubdepartments}
            />
          </div>

          {/* File Description */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">File Description</label>
            <Input
              className="w-full"
              value={newDoc.fileDescription || ""}
              onChange={(e) =>
                setNewDoc({ ...newDoc, fileDescription: e.target.value })
              }
            />
          </div>

          {/* File Date */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">File Date</label>
            <Input
              type="date"
              className="w-full"
              value={newDoc.fileDate}
              onChange={(e) =>
                setNewDoc({ ...newDoc, fileDate: e.target.value })
              }
            />
          </div>

          {/* Name */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Name</label>
            <Input
              className="w-full"
              value={newDoc.name || ""}
              onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
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
            />
          </div>

          {/* Expiration Date */}
          <div className="col-span-1">
            <label className="text-sm sm:text-base">Expiration Date</label>
            <Input
              type="date"
              className="w-full"
              value={newDoc.expirationDate}
              onChange={(e) =>
                setNewDoc({ ...newDoc, expirationDate: e.target.value })
              }
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
          <div className="col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base">Attachment</label>
            <Input
              type="file"
              onChange={handleAttach}
              className="w-full text-sm"
            />
            {selectedFile && (
              <p className="text-xs sm:text-sm mt-1 text-blue-700 truncate">
                Attached: {selectedFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleAddOrUpdate}
            className="w-full sm:w-2/3 md:w-1/3 px-2 bg-blue-600 text-white hover:bg-blue-700"
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
              <thead className="bg-blue-100">
                <tr>
                  <th className="border p-2 text-left">File</th>
                  <th className="border p-2 text-left hidden sm:table-cell">
                    Name
                  </th>
                  <th className="border p-2 text-left hidden md:table-cell">
                    Description
                  </th>
                  <th className="border p-2 text-left">Expiration</th>
                  <th className="border p-2 text-left hidden sm:table-cell">
                    Attachment
                  </th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="odd:bg-gray-50 even:bg-white">
                    <td className="border p-2">{doc.id}</td>
                    <td className="border p-2 hidden sm:table-cell">
                      {doc.name}
                    </td>
                    <td className="border p-2 hidden md:table-cell">
                      {doc.description}
                    </td>
                    <td className="border p-2">{doc.expirationDate || "-"}</td>
                    <td className="border p-2 hidden sm:table-cell">
                      {doc.fileName || "-"}
                    </td>
                    <td className="border p-2 ">
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(doc.id)}
                          className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200"
                        >
                          Edit
                        </Button>
                        <DeleteDialog
                          key={doc.id}
                          onConfirm={() => handleDelete(doc.id)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full sm:flex-1 bg-red-600 text-white hover:bg-red-700"
                          >
                            Delete
                          </Button>
                        </DeleteDialog>
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
