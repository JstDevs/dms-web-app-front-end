import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Search, Edit, Trash2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@chakra-ui/react";

import { Input } from "@/components/ui/Input";
import { DeleteDialog } from "@/components/ui/DeleteDialog";
import { PaginationControls } from "@/components/ui/PaginationControls";

import {
  fetchSubDepartments,
  createSubDepartment,
  deleteSubDepartment,
  editSubDepartment,
} from "@/redux/thunk/SubdepartmentThunk";

import { AppDispatch, RootState } from "@/redux/store";
import { SubDepartment } from "@/types/Departments";
import { set } from "date-fns";

export const SubDepartments: React.FC = () => {
  // Redux
  const dispatch = useDispatch<AppDispatch>();
  const subDepartments = useSelector(
    (state: RootState) => state.subDepartments.items
  );

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [currentDepartment, setCurrentDepartment] =
    useState<SubDepartment | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtered & paginated data
  const filteredSubDepartments = subDepartments.filter(
    (dept) =>
      dept?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept?.Code?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedDepartments = filteredSubDepartments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Effects
  useEffect(() => {
    dispatch(fetchSubDepartments());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error("Both fields are required");
      return;
    }

    try {
      await dispatch(createSubDepartment(formData));
      await dispatch(fetchSubDepartments());
      toast.success("Sub-Department created successfully!");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to create sub-department"
      );
    } finally {
      setIsCreating(false);
      resetForm();
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteSubDepartment(id));
      await dispatch(fetchSubDepartments());
      toast.success("Sub-Department deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete sub-department");
    }
  };

  // Reset
  const resetForm = () => {
    setFormData({ name: "", code: "" });
    setCurrentDepartment(null);
  };
  // Inline Edit
  const handleEditSubmitInline = async (id: number) => {
    if (!formData.name || !formData.code) {
      toast.error("Both fields are required");
      return;
    }

    try {
      await dispatch(
        editSubDepartment({ id, name: formData.name, code: formData.code })
      );
      await dispatch(fetchSubDepartments());
      toast.success("Department updated!");
    } catch (error) {
      console.log(error);
      toast.error("Update failed.");
    } finally {
      setCurrentDepartment(null);
      setFormData({ name: "", code: "" });
    }
  };
  // Cancel
  const cancelEdit = () => {
    setCurrentDepartment(null);
    setFormData({ name: "", code: "" });
  };
  // ---------------- UI ----------------
  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-2 sm:p-6">
      {/* Header */}
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:gap-2">
        <div className="flex-1 text-left">
          <h1 className="text-3xl font-bold text-blue-800">Sub-Department</h1>
          <p className="mt-2 text-gray-600 truncate">
            Manage sub-department in the system
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

      {/* Search */}
      <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-lg font-semibold">Sub-Department</h2>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search sub-department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            icon={<Search className="h-4 w-4 text-gray-400" />}
          />
        </div>
      </div>

      {/* Form */}
      {isCreating && (
        <div className="mb-6 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">
            Create Sub-Department Form
          </h3>
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-2"
              >
                Create
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedDepartments.length > 0 ? (
              paginatedDepartments.map((dept) => {
                const isEditingRow = currentDepartment?.ID === dept.ID;
                return (
                  <tr key={dept.ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isEditingRow ? (
                        <Input
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              name: e.target.value,
                            })
                          }
                        />
                      ) : (
                        dept.Name
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditingRow ? (
                        <Input
                          value={formData.code}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              code: e.target.value,
                            })
                          }
                        />
                      ) : (
                        dept.Code
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      {isEditingRow ? (
                        <>
                          <Button
                            size="sm"
                            className="text-green-600 hover:text-green-900"
                            onClick={() => handleEditSubmitInline(dept.ID)}
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
                            onClick={() => {
                              setCurrentDepartment(dept);
                              setIsCreating(false);
                              setFormData({
                                name: dept.Name,
                                code: dept.Code,
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <DeleteDialog
                            key={dept.ID}
                            onConfirm={() => handleDelete(dept.ID)}
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
                  No sub-department found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredSubDepartments.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
