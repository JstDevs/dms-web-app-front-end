import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Plus, Search, Edit, Trash2, Save, X } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { DeleteDialog } from "@/components/ui/DeleteDialog";
import { Button } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import {
  fetchDepartments,
  createDepartment,
  editDepartment,
  deleteDepartment,
} from "@/redux/thunk/DepartmentThunk";
import { Department } from "@/types/Departments";

export const DepartmentsMain: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    code: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const dispatch = useDispatch<AppDispatch>();
  const departments = useSelector(
    (state: RootState) => state.departments.items
  );

  const filteredDepartments = departments?.filter(
    (dept) =>
      dept?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept?.Code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedDepartments = filteredDepartments?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Both fields are required
    if (!formData.name || !formData.code) {
      toast.error("Both fields are required");
      return;
    }
    // Check if department already exists
    const isDepartmentExists = departments.some(
      (department) =>
        department?.Name?.toLowerCase() === formData.name?.toLowerCase() ||
        department?.Code?.toLowerCase() === formData.code?.toLowerCase()
    );
    if (isDepartmentExists) {
      toast.error("Department already exists");
      return;
    }
    try {
      // Only send name and code - subdepartments are UI only for now
      await dispatch(
        createDepartment({ name: formData.name, code: formData.code })
      );
      await dispatch(fetchDepartments());
      toast.success("Department created successfully!");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to create department"
      );
    } finally {
      setFormData({ name: "", code: "" });
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteDepartment(id));
      await dispatch(fetchDepartments());
      toast.success("Department deleted successfully!");
    } catch (error) {
      console.log(error);
    }
  };

  const handleEditSubmitInline = async (id: number) => {
    if (!formData.name || !formData.code) {
      toast.error("Both fields are required");
      return;
    }

    // Check if department already exists (excluding current department)
    const isDepartmentExists = departments.some(
      (department) =>
        department.ID !== id && // Skip the current department
        (department?.Name?.toLowerCase() === formData.name?.toLowerCase() ||
          department?.Code?.toLowerCase() === formData.code?.toLowerCase())
    );

    if (isDepartmentExists) {
      toast.error("Department name or code already exists");
      return;
    }
    try {
      // Only send name and code - subdepartments are UI only for now
      await dispatch(
        editDepartment({
          id,
          name: formData.name,
          code: formData.code,
        })
      );
      await dispatch(fetchDepartments());
      toast.success("Department updated!");
    } catch (error) {
      console.log(error);
      toast.error("Update failed.");
    } finally {
      setCurrentDepartment(null);
      setFormData({ name: "", code: "" });
    }
  };

  const cancelEdit = () => {
    setCurrentDepartment(null);
    setFormData({ name: "", code: "" });
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-2 sm:p-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:gap-2">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">Department</h1>
          <p className="mt-2 text-gray-600 sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis">
            Manage departments and their sub-department in the system
          </p>
        </div>
        <div className="w-full sm:w-auto">
          {!isCreating && !isEditing && (
            <Button
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
                setFormData({ name: "", code: "" });
              }}
              className="w-full sm:w-auto px-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Department
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between flex-wrap gap-4">
          <h2 className="text-lg font-semibold">Department</h2>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              icon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
        </div>
        <div>
          {isCreating && (
            <div className="mb-6 p-4 border rounded-md">
              {/* <h3 className="text-lg font-medium mb-4">Create Department</h3> */}
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter department name"
                  required
                />
                <Input
                  label="Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Enter department code"
                  required
                />

                <div className="flex justify-end space-x-3 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setCurrentDepartment(null);
                      setFormData({
                        name: "",
                        code: "",
                      });
                    }}
                    className="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 px-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-2"
                  >
                    Create
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Code
                  </th>
                  {/* <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Sub-Department
                  </th> */}
                  <th className="px-6 py-3 text-right text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDepartments?.length > 0 ? (
                  paginatedDepartments?.map((dept) => {
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

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No department found
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
        totalItems={filteredDepartments?.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
