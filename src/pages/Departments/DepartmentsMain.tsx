import React, { useEffect, useState } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
// import { Button } from "@/components/ui/Button";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Department } from "@/types/User";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { DeleteDialog } from "@/components/ui/DeleteDialog";
import { Button } from "@chakra-ui/react";
// import { RootState } from "@/redux/store";
// import { useDispatch, useSelector } from "react-redux";

export const DepartmentsMain: React.FC = () => {
  //   const dispatch = useDispatch();
  //   const departments = useSelector(
  //     (state: RootState) => state.departments.departments
  //   );
  //   const [departments, setDepartments] = useState<Department[]>([

  //   ]);
  const [departments, setDepartments] = useState<Department[]>([
    { id: "1", name: "Finance", code: "FIN" },
    { id: "2", name: "Human Resources", code: "HR" },
    { id: "3", name: "IT Department", code: "IT" },
    { id: "4", name: "Legal", code: "LEG" },
    { id: "5", name: "Procurement", code: "PRC" },
    { id: "6", name: "Marketing", code: "MKT" },
    { id: "7", name: "Operations", code: "OPS" },
    { id: "8", name: "Sales", code: "SLS" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(
    null
  );
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  //   -----------------FILTER DEPARTMENTS-----------------
  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  //   --------------------PAGINATE DEPARTMENTS--------------------
  const paginatedDepartments = filteredDepartments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  //   ------------SET CURRENT PAGE TO 1 WHEN SEARCH TERM OR ITEMS PER PAGE CHANGES----------------
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  //   ---------------------SUBMIT CREATE DEPARTMENT---------------------
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newDepartment: Department = {
      id: (departments.length + 1).toString(),
      name: formData.name,
      code: formData.code,
    };

    setDepartments([...departments, newDepartment]);
    setFormData({ name: "", code: "" });
    setIsCreating(false);
  };

  //   ---------------------EDIT BUTTON CLICK---------------------
  const handleEditClick = (dept: Department) => {
    setCurrentDepartment(dept);
    setFormData({ name: dept.name, code: dept.code });
    setIsEditing(true);
    setIsCreating(false);
  };

  //   ---------------------EDIT DEPARTMENTS---------------------
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentDepartment) {
      const updatedDepartments = departments.map((dept) =>
        dept.id === currentDepartment.id
          ? { ...dept, name: formData.name, code: formData.code }
          : dept
      );

      setDepartments(updatedDepartments);
      setFormData({ name: "", code: "" });
      setIsEditing(false);
      setCurrentDepartment(null);
    }
  };

  //   ------------------- DELETE DEPARTMENT -------------------
  const handleDelete = (id: string) => {
    setDepartments(departments.filter((dept) => dept.id !== id));
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:gap-2">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">Departments</h1>
          <p className="mt-2 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
            Manage departments in the system
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
          <h2>Departments List</h2>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search departments..."
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
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    colorPalette={"gray"}
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setCurrentDepartment(null);
                      setFormData({ name: "", code: "" });
                    }}
                    className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 px-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-2"
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
                    <tr key={dept.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleEditClick(dept)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <DeleteDialog
                          key={dept.id}
                          onConfirm={() => handleDelete(dept.id)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
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
                      No departments found
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
        totalItems={filteredDepartments.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
