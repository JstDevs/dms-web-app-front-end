import React, { useEffect, useRef, useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Search, Edit, Trash2, UserPlus } from 'lucide-react';
import { DeleteDialog } from '../../components/ui/DeleteDialog';
import { User } from '@/types/User';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Button } from '@chakra-ui/react';
import { useUsers } from './useUser';
import toast from 'react-hot-toast';
import { Portal, Select } from '@chakra-ui/react';
import useAccessLevelRole from './Users Access/useAccessLevelRole';
import { deleteUserSoft, registerUser, updateUser } from '@/api/auth';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';

export const UsersPage: React.FC = () => {
  const { users, loading, error, refetch } = useUsers();
  const { accessOptions } = useAccessLevelRole();
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessLevelValue, setAccessLevelValue] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (users) setLocalUsers(users);
  }, [users]);

  const filteredUsers = localUsers?.filter((user) =>
    user.UserName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedDepartments = filteredUsers?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const userPagePermissions = useModulePermissions(5); // 1 = MODULE_ID
  // Functions
  // ---------- Create USERS-------------
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (
      !formData.password ||
      !formData.confirmPassword ||
      !formData.username ||
      accessLevelValue.length === 0
    ) {
      toast.error('Please fill out all fields');
      return;
    }

    const payload = {
      userName: formData.username,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      employeeID: Math.floor(Math.random() * 10000),
      userAccessArray: JSON.stringify(accessLevelValue),
    };

    try {
      await registerUser(payload);
      refetch();
      toast.success('User created successfully!');
      // ✅ Reset only on success
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }

    setIsCreating(false);
  };

  const handleEditClick = (user: User) => {
    setCurrentUser(user);
    setFormData({
      username: user.UserName,
      password: '',
      confirmPassword: '',
    });

    const selectedAccessLevel = user.accessList.map((accessLevel) =>
      accessLevel.ID.toString()
    );
    setAccessLevelValue(selectedAccessLevel);
    setIsEditing(true);
    setIsCreating(false);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (!formData.username || accessLevelValue.length === 0) {
      toast.error('Please fill out all fields');
      return;
    }

    const payload = {
      userName: formData.username,
      password: formData.password,
      cpassword: formData.confirmPassword,
      id: currentUser?.ID,
      userAccessArray: JSON.stringify(accessLevelValue),
    };

    try {
      await updateUser(payload);
      refetch();
      toast.success('User updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update user');
    } finally {
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
      });
      setAccessLevelValue([]);
      setIsEditing(false);
      setCurrentUser(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUserSoft(id);
      toast.success('User deleted');
      setLocalUsers((prev) => prev.filter((user) => user.ID !== id));
    } catch (error) {
      console.log(error);
      toast.error('Failed to delete user');
    }
  };
  // console.log({ paginatedDepartments });
  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg p-3 sm:p-6">
      <header className="flex justify-between items-center gap-4 flex-wrap">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-bold text-blue-800">Users</h1>
          <p className="mt-2 text-gray-600">
            Manage system users and access permissions
          </p>
        </div>
        <div className="w-full sm:w-auto">
          {userPagePermissions?.Add && !isCreating && !isEditing && (
            <Button
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
                setFormData({
                  username: '',
                  password: '',
                  confirmPassword: '',
                });
              }}
              className="w-full sm:w-auto px-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Create User
            </Button>
          )}
        </div>
      </header>
      {loading ? (
        <p className="text-center font-bold text-2xl">Loading...</p>
      ) : (
        <div className="mt-6">
          <div className="flex flex-row items-center justify-between flex-wrap gap-4 py-4">
            <h2 className="text-lg font-semibold">System Users</h2>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                icon={<Search className="h-4 w-4 text-gray-400" />}
              />
            </div>
          </div>

          {(isCreating || isEditing) && (
            <div className="mb-6 p-4 border rounded-md" ref={formRef}>
              <h3 className="text-lg font-medium mb-4">
                {isEditing ? 'Edit User' : 'Create User'}
              </h3>
              <form
                onSubmit={isEditing ? handleEditSubmit : handleCreateSubmit}
                className="space-y-4"
              >
                <Input
                  label={'Username (No Spaces Allowed)'}
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      username: e.target.value.trim(),
                    })
                  }
                  placeholder="Enter username"
                  required
                />

                {accessOptions && (
                  <Select.Root
                    multiple
                    collection={accessOptions}
                    size="sm"
                    className="w-full"
                    value={accessLevelValue}
                    onValueChange={(e) => {
                      setAccessLevelValue(e.value);
                    }}
                  >
                    <Select.HiddenSelect />
                    <Select.Label>Access Level</Select.Label>
                    <Select.Control className="border px-2 rounded-md border-gray-300">
                      <Select.Trigger>
                        <Select.ValueText placeholder="Access Level" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content border={'medium'}>
                          {accessOptions?.items?.map((accessType: any) => (
                            <Select.Item
                              item={accessType}
                              key={accessType.value}
                            >
                              {accessType.label}
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                )}
                <Input
                  label={isEditing ? 'New Password (optional)' : 'Password'}
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!isEditing}
                  placeholder="Password"
                  min={6}
                />
                {(formData.password || !isEditing) && (
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    min={6}
                    required={!isEditing}
                  />
                )}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setCurrentUser(null);
                      setFormData({
                        username: '',
                        password: '',
                        confirmPassword: '',
                      });
                    }}
                    className="bg-gray-100 hover:bg-gray-200 px-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2"
                  >
                    {isEditing ? 'Update' : 'Create'}
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
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Access Level
                  </th>
                  <th className="px-6 py-3 text-right text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDepartments?.length > 0 ? (
                  paginatedDepartments?.map((user) => (
                    <tr key={user.ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.UserName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500  space-x-1">
                        {user?.accessList?.length > 0
                          ? user?.accessList.map((access: any) => (
                              <span
                                key={access.ID}
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${
                              access?.Description === 'Administrator'
                                ? 'bg-blue-100 text-blue-800'
                                : access?.Description === 'Manager'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                              >
                                {access?.Description || 'User'}
                              </span>
                            ))
                          : ''}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        {userPagePermissions?.Edit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => handleEditClick(user)}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        {userPagePermissions?.Delete && (
                          <DeleteDialog
                            key={user.ID}
                            onConfirm={() => handleDelete(user.ID)}
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
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredUsers?.length || 0}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}
    </div>
  );
};
