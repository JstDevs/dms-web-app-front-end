import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { DeleteDialog } from "@/components/ui/DeleteDialog";
import { Button } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import {
  fetchSubDepartments,
  createSubDepartment,
  deleteSubDepartment,
  editSubDepartment,
} from "@/redux/thunk/SubdepartmentThunk";
import { SubDepartment } from "@/types/Departments";

export const SubDepartments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDepartment, setCurrentDepartment] =
    useState<SubDepartment | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // ------------------REDUX STATES----------------------
  const dispatch = useDispatch<AppDispatch>();
  const subDepartments = useSelector(
    (state: RootState) => state.subDepartments.items
  );
  // ------------------FORM REF TO MOVE TO TOP ---------------
  const formRef = useRef<HTMLDivElement>(null);
  // ----------------FILTER SubDEPARTMENT----------------
  const filteredSubDepartments = subDepartments.filter(
    (dept) =>
      dept?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept?.Code?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // ---------------------PAGINATION----------------------
  const paginatedDepartments = filteredSubDepartments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  // --------------USE EFFECTS-------------------
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);
  // Fetch on mount
  useEffect(() => {
    dispatch(fetchSubDepartments());
  }, [dispatch]);

  // ----------------FUNCTIONS--------------------
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error("Both fields are required");
      return;
    }
    try {
      //  return {statue:true}
      await dispatch(createSubDepartment(formData));
      await dispatch(fetchSubDepartments());

      toast.success("Sub-Department created successfully!");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to create sub-department"
      );
    } finally {
      setFormData({ name: "", code: "" });
      setIsCreating(false);
    }
  };

  const handleEditClick = (dept: SubDepartment) => {
    setCurrentDepartment(dept);
    setFormData({ name: dept.Name, code: dept.Code });
    setIsEditing(true);
    setIsCreating(false);
    // Scroll to the form after rendering
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100); // slight delay ensures DOM updates
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (currentDepartment) {
        await dispatch(
          editSubDepartment({
            id: currentDepartment.ID,
            name: formData.name,
            code: formData.code,
          })
        );
        await dispatch(fetchSubDepartments());
        toast.success("Sub-Department edited successfully!");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setFormData({ name: "", code: "" });
      setIsEditing(false);
      setCurrentDepartment(null);
    }
  };

  const handleDelete = async (id: number) => {
    console.log(id);
    try {
      await dispatch(deleteSubDepartment(id));
      await dispatch(fetchSubDepartments());
      toast.success("Sub-Department deleted successfully!");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-2 sm:p-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4  sm:gap-2">
        <div className="text-left flex-1 ">
          <h1 className="text-3xl font-bold text-blue-800">Sub-Department</h1>
          <p className="mt-2 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
            Manage sub-department in the system
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
              Create Sub-Department
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between flex-wrap gap-4">
          <h2>Sub-Department</h2>
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
        <div>
          {(isCreating || isEditing) && (
            <div className="mb-6 p-4 border rounded-md" ref={formRef}>
              <h3 className="text-lg font-medium mb-4">
                {isEditing ? "Edit Department" : "Create Department"}
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
                <div className="flex justify-end space-x-3 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setCurrentDepartment(null);
                      setFormData({ name: "", code: "" });
                    }}
                    className="flex-1 sm:flex-initial  bg-gray-100 hover:bg-gray-200 px-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-2"
                  >
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
                {paginatedDepartments.length > 0 ? (
                  paginatedDepartments.map((dept) => (
                    <tr key={dept.ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dept.Name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.Code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900 mr-2"
                          onClick={() => handleEditClick(dept)}
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
                      </td>
                    </tr>
                  ))
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
        </div>
      </div>
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
