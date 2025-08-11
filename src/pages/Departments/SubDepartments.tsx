import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, Edit, Trash2, Save, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import {
  fetchSubDepartments,
  createSubDepartment,
  deleteSubDepartment,
  editSubDepartment,
} from '@/redux/thunk/SubdepartmentThunk';

import { AppDispatch, RootState } from '@/redux/store';
import { SubDepartment } from '@/types/Departments';
import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { DeleteDialog } from '@/components/ui/DeleteDialog';
import { Button } from '@chakra-ui/react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';

export const SubDepartments: React.FC = () => {
  // Redux
  const dispatch = useDispatch<AppDispatch>();
  const subDepartments = useSelector(
    (state: RootState) => state.subDepartments.items
  );

  // Hooks
  const { departmentOptions } = useDepartmentOptions();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentDepartment, setCurrentDepartment] =
    useState<SubDepartment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
  });
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
  const subDepartmentPermissions = useModulePermissions(2); // 1 = MODULE_ID
  // Effects
  useEffect(() => {
    dispatch(fetchSubDepartments());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // Helper function to get department name by ID
  const getDepartmentName = (departmentId: string) => {
    const dept = departmentOptions.find((d) => d.value == departmentId);
    console.log(dept, departmentOptions, departmentId);
    return dept ? dept.label : 'Unknown Department';
  };

  // Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code || !formData.departmentId) {
      toast.error('All fields are required');
      return;
    }

    // if (formData.name.trim().length < 3 || formData.code.trim().length < 3) {
    //   toast.error('Name and code must be at least 3 characters long');
    //   return;
    // }

    // if (formData.name.trim().length > 20 || formData.code.trim().length > 20) {
    //   toast.error('Name and code must not be greater than 20 characters long');
    //   return;
    // }

    // Check if sub-department already exists
    const isDepartmentExists = subDepartments.some(
      (department) =>
        department?.Name?.toLowerCase() === formData.name?.toLowerCase() ||
        department?.Code?.toLowerCase() === formData.code?.toLowerCase()
    );

    if (isDepartmentExists) {
      toast.error('Sub-Department already exists');
      return;
    }

    try {
      await dispatch(
        createSubDepartment({
          name: formData.name,
          code: formData.code,
          departmentId: Number(formData.departmentId),
        })
      ).unwrap();
      await dispatch(fetchSubDepartments()).unwrap();
      toast.success('Sub-Department created successfully!');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to create sub-department'
      );
    } finally {
      setIsCreating(false);
      resetForm();
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteSubDepartment(id)).unwrap();
      await dispatch(fetchSubDepartments()).unwrap();
      toast.success('Sub-Department deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete sub-department');
    }
  };

  // Reset
  const resetForm = () => {
    setFormData({ name: '', code: '', departmentId: '' });
    setCurrentDepartment(null);
  };

  // Inline Edit
  const handleEditSubmitInline = async (id: number) => {
    if (!formData.name || !formData.code || !formData.departmentId) {
      toast.error('All fields are required');
      return;
    }

    if (formData.name.length < 3 || formData.code.length < 3) {
      toast.error('Name and code must be at least 3 characters long');
      return;
    }

    if (formData.name.trim().length > 20 || formData.code.trim().length > 20) {
      toast.error('Name and code must not be greater than 20 characters long');
      return;
    }

    // Check if sub-department already exists (excluding current department)
    const isDepartmentExists = subDepartments.some(
      (department) =>
        department.ID !== id &&
        (department?.Name?.toLowerCase() === formData.name?.toLowerCase() ||
          department?.Code?.toLowerCase() === formData.code?.toLowerCase())
    );

    if (isDepartmentExists) {
      toast.error('Sub-Department name or code already exists');
      return;
    }

    try {
      await dispatch(
        editSubDepartment({
          id,
          name: formData.name,
          code: formData.code,
          departmentId: String(formData.departmentId),
        })
      ).unwrap();
      await dispatch(fetchSubDepartments()).unwrap();
      toast.success('Sub-Department updated!');
    } catch (error) {
      toast.error('Update failed.');
    } finally {
      setCurrentDepartment(null);
      setFormData({ name: '', code: '', departmentId: '' });
    }
  };

  // Cancel
  const cancelEdit = () => {
    setCurrentDepartment(null);
    setFormData({ name: '', code: '', departmentId: '' });
  };

  // ---------------- UI ----------------
  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg animate-fade-in p-3 sm:p-6">
      {/* Header */}
      <header className="mb-8 flex flex-wrap justify-between items-center gap-4 sm:gap-2">
        <div className="flex-1 text-left">
          <h1 className="text-3xl font-bold text-blue-800">
            Sub-Department Management
          </h1>
          <p className="mt-2 text-gray-600 sm:truncate">
            Manage sub-departments and assign them to departments
          </p>
        </div>
        {subDepartmentPermissions?.Add && !isCreating && (
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
        <h2 className="text-lg font-semibold">Sub-Departments</h2>
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
        <div className="mb-6 p-4 border rounded-md bg-gray-50">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">
            Create New Sub-Department
          </h3>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <Input
              label="Sub-Department Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="Enter sub-department name"
            />
            <Input
              label="Sub-Department Code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              required
              placeholder="Enter sub-department code"
            />

            <Select
              label="Parent Department"
              value={formData.departmentId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  departmentId: e.target.value.toString(),
                })
              }
              options={departmentOptions.map((opt) => ({
                value: String(opt.value),
                label: opt.label,
              }))}
              placeholder="Select parent department"
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
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                Create Sub-Department
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <span className="text-gray-600">{dept.Code}</span>
                      )}
                    </td>
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
                        <span className="font-medium text-gray-700">
                          {dept.Name}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditingRow ? (
                        <Select
                          value={formData.departmentId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              departmentId: String(e.target.value),
                            })
                          }
                          options={departmentOptions.map((opt) => ({
                            value: String(opt.value),
                            label: opt.label,
                          }))}
                          placeholder="Select department"
                        />
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          {getDepartmentName(dept?.DepartmentID?.toString())}
                        </span>
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
                          {subDepartmentPermissions.Edit && (
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
                                  departmentId: String(dept.DepartmentID),
                                });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {subDepartmentPermissions.Delete && (
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
                              </Button>
                            </DeleteDialog>
                          )}
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
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <Search className="h-8 w-8 text-gray-300 mb-2" />
                    <p>No sub-departments found</p>
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
