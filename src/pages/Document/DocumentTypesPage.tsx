import React, { useState } from "react";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
// import { Button } from "../../components/ui/Button";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { DeleteDialog } from "../../components/ui/DeleteDialog";
import { DocumentType } from "@/types/User";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Button } from "@chakra-ui/react";

export const DocumentTypesPage: React.FC = () => {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([
    { id: "1", name: "Invoice", code: "INV" },
    { id: "2", name: "Receipt", code: "RCP" },
    { id: "3", name: "Contract", code: "CON" },
    { id: "4", name: "Agreement", code: "AGR" },
    { id: "5", name: "Report", code: "RPT" },
    { id: "6", name: "Report 3", code: "RPT3" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(
    null
  );
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const filteredDocumentTypes = documentTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedDepartments = filteredDocumentTypes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newDocumentType: DocumentType = {
      id: (documentTypes.length + 1).toString(),
      name: formData.name,
      code: formData.code,
    };

    setDocumentTypes([...documentTypes, newDocumentType]);
    setFormData({ name: "", code: "" });
    setIsCreating(false);
  };

  const handleEditClick = (docType: DocumentType) => {
    setCurrentDocType(docType);
    setFormData({ name: docType.name, code: docType.code });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentDocType) {
      const updatedDocTypes = documentTypes.map((docType) =>
        docType.id === currentDocType.id
          ? { ...docType, name: formData.name, code: formData.code }
          : docType
      );

      setDocumentTypes(updatedDocTypes);
      setFormData({ name: "", code: "" });
      setIsEditing(false);
      setCurrentDocType(null);
    }
  };

  const handleDelete = (id: string) => {
    setDocumentTypes(documentTypes.filter((docType) => docType.id !== id));
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:gap-2">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">Document Types</h1>
          <p className="mt-2 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
            Manage document types in the system
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Button
            onClick={() => {
              setIsCreating(true);
              setIsEditing(false);
              setFormData({ name: "", code: "" });
            }}
            // icon={<Plus className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Create Document Type
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between flex-wrap gap-4">
          <h2>Document Types</h2>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search document types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              icon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
        </div>
        <div>
          {(isCreating || isEditing) && (
            <div className="mb-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-4">
                {isEditing ? "Edit Document Type" : "Create Document Type"}
              </h3>
              <form
                onSubmit={isEditing ? handleEditSubmit : handleCreateSubmit}
                className="space-y-4"
              >
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <Input
                  label="Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  required
                />
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setCurrentDocType(null);
                      setFormData({ name: "", code: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isEditing ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Code
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDepartments.length > 0 ? (
                  paginatedDepartments.map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {type.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {type.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900 mr-2"
                          // icon={<Edit className="h-4 w-4" />}
                          onClick={() => handleEditClick(type)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <DeleteDialog
                          key={type.id}
                          onConfirm={() => handleDelete(type.id)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-900"
                            // icon={<Trash2 className="h-4 w-4" />}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </DeleteDialog>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No document types found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalItems={documentTypes.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
