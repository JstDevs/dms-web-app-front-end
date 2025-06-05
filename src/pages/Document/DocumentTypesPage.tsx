import React, { useRef, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Plus, Search, Edit, Trash2, Save, X } from "lucide-react";
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
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(
    null
  );
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [editFormData, setEditFormData] = useState({ name: "", code: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const formRef = useRef<HTMLDivElement>(null);

  const filteredDocumentTypes = documentTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedDocumentTypes = filteredDocumentTypes.slice(
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
    setEditFormData({ name: docType.name, code: docType.code });
    setIsCreating(false);
  };

  const handleEditSubmitInline = (id: string) => {
    const updatedDocTypes = documentTypes.map((docType) =>
      docType.id === id
        ? { ...docType, name: editFormData.name, code: editFormData.code }
        : docType
    );
    setDocumentTypes(updatedDocTypes);
    setCurrentDocType(null);
    setEditFormData({ name: "", code: "" });
  };

  const cancelEdit = () => {
    setCurrentDocType(null);
    setEditFormData({ name: "", code: "" });
  };

  const handleDelete = (id: string) => {
    setDocumentTypes(documentTypes.filter((docType) => docType.id !== id));
  };
  // Reset
  const resetForm = () => {
    setFormData({ name: "", code: "" });
    setCurrentDocType(null);
  };
  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-2 sm:p-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:gap-2">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">Document Types</h1>
          <p className="mt-2 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
            Manage document types in the system
          </p>
        </div>
        {!isCreating && (
          <Button
            onClick={() => {
              setIsCreating(true);
              resetForm();
            }}
            className="w-full sm:w-auto px-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Sub-Department
          </Button>
        )}
      </header>

      {/* Create Form */}
      {isCreating && (
        <div className="mb-6 p-4 border rounded-md" ref={formRef}>
          <h3 className="text-lg font-medium mb-4">Create Document Type</h3>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
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
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}
                className="bg-gray-100 hover:bg-gray-200 px-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Table */}
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDocumentTypes.length > 0 ? (
                paginatedDocumentTypes.map((type) => {
                  const isEditing = currentDocType?.id === type.id;
                  return (
                    <tr key={type.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <Input
                            value={editFormData.name}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          type.name
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <Input
                            value={editFormData.code}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                code: e.target.value,
                              })
                            }
                          />
                        ) : (
                          type.code
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              className="text-green-600 hover:text-green-900"
                              onClick={() => handleEditSubmitInline(type.id)}
                            >
                              <Save className="h-4 w-4" /> Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-900"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleEditClick(type)}
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <DeleteDialog
                              onConfirm={() => handleDelete(type.id)}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </DeleteDialog>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
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

      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredDocumentTypes.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
