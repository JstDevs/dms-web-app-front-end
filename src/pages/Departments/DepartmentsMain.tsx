import React, { useEffect, useState } from 'react';
// import { Input } from "./ui/Input";
// import { Button } from "./ui/Button";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
// import { PaginationControls } from "./ui/PaginationControls";
// import { DeleteDialog } from "./ui/DeleteDialog";
import toast, { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import {
  fetchDepartments,
  createDepartment,
  editDepartment,
  deleteDepartment,
} from '@/redux/thunk/DepartmentThunk';
import { Department } from '@/types/Departments';
import { Button } from '@chakra-ui/react';
import { Input } from '@/components/ui/Input';
import { DeleteDialog } from '@/components/ui/DeleteDialog';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';

export const DepartmentsMain: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: '',
    code: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<number>>(
    new Set()
  );

  const dispatch = useDispatch<AppDispatch>();
  const departments = useSelector(
    (state: RootState) => state.departments.items
  );

  const departmentPermissions = useModulePermissions(1); // 1 = MODULE_ID

  // Create flattened list for searching and pagination
  const createFlattenedList = () => {
    const flattened: Array<{
      type: 'department' | 'subdepartment';
      data: Department;
      parent?: Department;
      isExpanded?: boolean;
    }> = [];

    departments?.forEach((dept) => {
      flattened.push({
        type: 'department',
        data: dept,
        isExpanded: expandedDepartments.has(dept.ID),
      });

      if (expandedDepartments.has(dept.ID) && dept.SubDepartments) {
        dept.SubDepartments.forEach((subDept) => {
          flattened.push({
            type: 'subdepartment',
            data: { ...subDept, SubDepartments: [] } as Department,
            parent: dept,
          });
        });
      }
    });

    return flattened;
  };

  const flattenedList = createFlattenedList();

  const filteredItems = flattenedList.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.data.Name?.toLowerCase().includes(searchLower) ||
      item.data.Code?.toLowerCase().includes(searchLower) ||
      (item.parent &&
        (item.parent.Name?.toLowerCase().includes(searchLower) ||
          item.parent.Code?.toLowerCase().includes(searchLower)))
    );
  });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleExpand = (departmentId: number) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(departmentId)) {
      newExpanded.delete(departmentId);
    } else {
      newExpanded.add(departmentId);
    }
    setExpandedDepartments(newExpanded);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error('Both fields are required');
      return;
    }
    if (formData.name.trim().length < 2 || formData.code.trim().length < 2) {
      toast.error('Name and code must be at least 2 characters long');
      return;
    }
    // if (formData.name.trim().length > 200 || formData.code.trim().length > 200) {
    //   toast.error('Name and code must not be greater than 200 characters long');
    //   return;
    // }

    const isDepartmentExists = departments.some(
      (department) =>
        department?.Name?.toLowerCase() === formData.name?.toLowerCase() ||
        department?.Code?.toLowerCase() === formData.code?.toLowerCase()
    );
    if (isDepartmentExists) {
      toast.error('Department already exists');
      return;
    }

    try {
      await dispatch(
        createDepartment({ name: formData.name, code: formData.code })
      ).unwrap();
      await dispatch(fetchDepartments()).unwrap();
      toast.success('Department created successfully!');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to create department'
      );
    } finally {
      setFormData({ name: '', code: '' });
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number, isDepartment: boolean = true) => {
    try {
      await dispatch(deleteDepartment(id)).unwrap();
      await dispatch(fetchDepartments()).unwrap();
      toast.success(
        `${
          isDepartment ? 'Department' : 'Sub-department'
        } deleted successfully!`
      );
    } catch (error) {
      toast.error(
        `Failed to delete ${isDepartment ? 'department' : 'sub-department'}`
      );
    }
  };

  const handleEditSubmitInline = async (id: number) => {
    if (!formData.name || !formData.code) {
      toast.error('Both fields are required');
      return;
    }
    if (formData.name.trim().length < 2 || formData.code.trim().length < 2) {
      toast.error('Name and code must be at least 2 characters long');
      return;
    }
    // if (formData.name.trim().length > 20 || formData.code.trim().length > 20) {
    //   toast.error('Name and code must not be greater than 20 characters long');
    //   return;
    // }

    const isDepartmentExists = departments.some(
      (department) =>
        department.ID !== id &&
        (department?.Name?.toLowerCase() === formData.name?.toLowerCase() ||
          department?.Code?.toLowerCase() === formData.code?.toLowerCase())
    );

    if (isDepartmentExists) {
      toast.error('Department name or code already exists');
      return;
    }

    try {
      await dispatch(
        editDepartment({ id, name: formData.name, code: formData.code })
      ).unwrap();
      await dispatch(fetchDepartments()).unwrap();
      toast.success('Department updated!');
    } catch (error) {
      toast.error('Update failed.');
    } finally {
      setCurrentDepartment(null);
      setFormData({ name: '', code: '' });
    }
  };

  const cancelEdit = () => {
    setCurrentDepartment(null);
    setFormData({ name: '', code: '' });
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-3 sm:p-6">
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:gap-2">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">
            Department Management
          </h1>
          <p className="mt-2 text-gray-600 sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis">
            Manage departments and their sub-departments in the system
          </p>
        </div>
        <div className="w-full sm:w-auto">
          {departmentPermissions.Add && !isCreating && (
            <Button
              onClick={() => {
                setIsCreating(true);
                setFormData({ name: '', code: '' });
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
          <h2 className="text-lg font-semibold">
            Departments & Sub-Departments
          </h2>
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

        {isCreating && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-medium mb-4 text-blue-800">
              Create New Department
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Input
                label="Department Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter department name"
                required
              />
              <Input
                label="Department Code"
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
                    setCurrentDepartment(null);
                    setFormData({ name: '', code: '' });
                  }}
                  className="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                >
                  Create Department
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
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => {
                  const isEditingRow = currentDepartment?.ID === item.data.ID;
                  const isDepartment = item.type === 'department';
                  const hasSubDepartments =
                    isDepartment &&
                    item.data.SubDepartments &&
                    item.data.SubDepartments.length > 0;

                  return (
                    <tr
                      key={`${item.type}-${item.data.ID}-${index}`}
                      className={`hover:bg-gray-50 ${
                        !isDepartment ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isDepartment && isEditingRow ? (
                          <Input
                            value={formData.code}
                            onChange={(e) =>
                              setFormData({ ...formData, code: e.target.value })
                            }
                            className="min-w-24"
                          />
                        ) : (
                          <span
                            className={!isDepartment ? 'text-blue-600' : ''}
                          >
                            {item.data.Code}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {isDepartment && hasSubDepartments && (
                            <button
                              onClick={() => toggleExpand(item.data.ID)}
                              className="mr-2 p-1 hover:bg-gray-200 rounded"
                            >
                              {item.isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {!isDepartment && <div className="w-8 mr-2" />}
                          <div className="flex items-center">
                            {!isDepartment && (
                              <div className="w-4 h-4 mr-2 border-l-2 border-b-2 border-gray-300 rounded-bl-md"></div>
                            )}
                            {isDepartment && isEditingRow ? (
                              <Input
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    name: e.target.value,
                                  })
                                }
                                className="min-w-32"
                              />
                            ) : (
                              <span
                                className={
                                  !isDepartment
                                    ? 'text-blue-700 font-medium'
                                    : 'font-semibold'
                                }
                              >
                                {item.data.Name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isDepartment
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isDepartment ? 'Department' : 'Sub-Department'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {/* Only show edit/delete for departments, not sub-departments */}
                        {isDepartment && (
                          <>
                            {isEditingRow ? (
                              <>
                                <Button
                                  size="sm"
                                  className="text-green-600 hover:text-green-900"
                                  onClick={() =>
                                    handleEditSubmitInline(item.data.ID)
                                  }
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-600 hover:text-gray-900"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {departmentPermissions?.Edit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-900"
                                    onClick={() => {
                                      setCurrentDepartment(item.data);
                                      setIsCreating(false);
                                      setFormData({
                                        name: item.data.Name,
                                        code: item.data.Code,
                                      });
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {departmentPermissions?.Delete && (
                                  <DeleteDialog
                                    onConfirm={() =>
                                      handleDelete(item.data.ID, true)
                                    }
                                    // title="Delete Department"
                                    // message="Are you sure you want to delete this department? This will also delete all sub-departments under it."
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DeleteDialog>
                                )}
                              </>
                            )}
                          </>
                        )}
                        {!isDepartment && (
                          <span className="text-gray-400 text-sm italic">
                            Managed through department
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    <div className="flex flex-col items-center">
                      <Search className="h-8 w-8 text-gray-300 mb-2" />
                      <p>No departments found</p>
                      {searchTerm && (
                        <p className="text-xs text-gray-400 mt-1">
                          Try adjusting your search terms
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredItems.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
