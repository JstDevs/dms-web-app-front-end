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
import { useAuth } from '@/contexts/AuthContext';
import { logSystemActivity } from '@/utils/activityLogger';
import {
  getPasswordValidationErrors,
  PASSWORD_REQUIREMENTS_TEXT,
} from '@/utils/passwordValidation';
import axios from '@/api/axios';

export const UsersPage: React.FC = () => {
  const { users, loading, error, refetch } = useUsers();
  const { user, updateUserInContext, selectedRole } = useAuth();
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
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (users) setLocalUsers(users);
  }, [users]);

  useEffect(() => {
    if (formData.password) {
      setPasswordErrors(getPasswordValidationErrors(formData.password));
    } else {
      setPasswordErrors([]);
    }
  }, [formData.password]);

  useEffect(() => {
    if (!formData.confirmPassword) {
      setConfirmPasswordError('');
      return;
    }
    setConfirmPasswordError(
      formData.password === formData.confirmPassword
        ? ''
        : 'Passwords do not match.'
    );
  }, [formData.password, formData.confirmPassword]);

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
    if (
      !formData.password ||
      !formData.confirmPassword ||
      !formData.username ||
      accessLevelValue.length === 0
    ) {
      toast.error('Please fill out all fields');
      return;
    }
    const passwordValidationErrors = getPasswordValidationErrors(
      formData.password
    );
    if (passwordValidationErrors.length) {
      toast.error(passwordValidationErrors[0]);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
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
      await refetch();
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

    // Only validate password if user has permission to update it
    if (canUpdatePassword(currentUser)) {
      if (formData.password) {
        const passwordValidationErrors = getPasswordValidationErrors(
          formData.password
        );
        if (passwordValidationErrors.length) {
          toast.error(passwordValidationErrors[0]);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
      }
    }

    if (!formData.username || accessLevelValue.length === 0) {
      toast.error('Please fill out all fields');
      return;
    }
    // const payload = {
    //   userName: formData.username,
    //   // Only include password if user has permission to update it
    //   ...(canUpdatePassword(currentUser) &&
    //     formData.password && {
    //       password: formData.password,
    //       cpassword: formData.confirmPassword,
    //     }),
    //   id: currentUser?.ID,
    //   userAccessArray: JSON.stringify(accessLevelValue),
    // };
    const payload = {
      userName: formData.username,
      password: formData.password,
      cpassword: formData.confirmPassword,
      id: currentUser?.ID,
      userAccessArray: JSON.stringify(accessLevelValue),
    };

    try {
      await updateUser(payload);
      await refetch();
      
      // Log user update activity
      try {
        await logSystemActivity(
          'USER_UPDATED',
          user!.ID,
          user!.UserName,
          'User',
          currentUser.UserName,
          `Updated by ${user.UserName}`
        );
      } catch (logError) {
        console.warn('Failed to log user update activity:', logError);
      }
      
      // ✅ if editing the logged-in user, update context
      // ✅ get the freshly updated list of users from API
      const updatedUser = (await axios.get('/users')).data.users.find(
        (u: User) => u.ID === currentUser?.ID
      );

      // ✅ if this was the logged-in user, update AuthContext
      if (updatedUser && updatedUser.ID === user?.ID) {
        updateUserInContext(updatedUser);
      }
      // sessionStorage.setItem('user', JSON.stringify(currentUser));
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
      setPasswordErrors([]);
      setConfirmPasswordError('');
      setAccessLevelValue([]);
      setIsEditing(false);
      setCurrentUser(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const userToDelete = localUsers.find(u => u.ID === id);
      await deleteUserSoft(id);
      
      // Log user deletion activity
      if (userToDelete) {
        try {
          await logSystemActivity(
            'USER_DELETED',
            user!.ID,
            user!.UserName,
            'User',
            userToDelete.UserName,
            `Deleted by ${user.UserName}`
          );
        } catch (logError) {
          console.warn('Failed to log user deletion activity:', logError);
        }
      }
      
      toast.success('User deleted');
      setLocalUsers((prev) => prev.filter((user) => user.ID !== id));
    } catch (error) {
      console.log(error);
      toast.error('Failed to delete user');
    }
  };

  // Add this helper function to check if user can update password
  const canUpdatePassword = (targetUser: User | null): boolean => {
    // Admin can update any password

    const isAdmin = selectedRole?.Description === 'Administration';

    // User can update their own password
    const isOwnProfile = targetUser?.ID === user?.ID;

    return isAdmin || isOwnProfile;
  };

  // console.log({ paginatedDepartments });
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg min-h-full flex-1 overflow-hidden">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <UserPlus className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold">Users</h1>
            </div>
            <p className="text-blue-100 text-sm sm:text-base mt-1">
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
                  setAccessLevelValue([]);
                }}
                className="w-full sm:w-auto flex items-center space-x-2 bg-white text-blue-600 hover:bg-blue-50 font-semibold px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <UserPlus className="h-5 w-5" />
                <span>Create User</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 font-medium">Loading users...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search and Filter Section */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">
                      System Users
                    </h2>
                    <p className="text-sm text-gray-500">
                      {filteredUsers?.length || 0} user{filteredUsers?.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="w-full sm:w-80">
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                      icon={<Search className="h-4 w-4 text-gray-400" />}
                    />
                  </div>
                </div>
              </div>

              {/* Create/Edit Form */}
              {(isCreating || isEditing) && (
                <div 
                  className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg p-6 sm:p-8 transition-all duration-200" 
                  ref={formRef}
                >
                  <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      isEditing ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {isEditing ? (
                        <Edit className={`h-5 w-5 ${isEditing ? 'text-blue-600' : 'text-green-600'}`} />
                      ) : (
                        <UserPlus className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {isEditing ? 'Edit User' : 'Create New User'}
                    </h3>
                  </div>
                  
                  <form
                    onSubmit={isEditing ? handleEditSubmit : handleCreateSubmit}
                    className="space-y-5"
                  >
                    <Input
                      label={'Username (No Spaces Allowed)'}
                      value={formData.username}
                      autoComplete='new-password'
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
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          Access Level <span className="text-red-500">*</span>
                        </label>
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
                          <Select.Control className="border-2 border-gray-200 px-4 py-2.5 rounded-lg hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <Select.Trigger>
                              <Select.ValueText placeholder="Select Access Level" />
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
                      </div>
                    )}

                    <>
                      <Input
                        label={isEditing ? 'New Password (optional)' : 'Password'}
                        type="password"
                        autoComplete='new-password'
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required={!isEditing}
                        placeholder="Enter password"
                        minLength={6}
                        error={passwordErrors[0]}
                      />
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-3">
                        <p className="text-xs text-blue-800 font-medium">
                          {PASSWORD_REQUIREMENTS_TEXT}
                        </p>
                      </div>
                      {(formData.password || !isEditing) && (
                        <Input
                          label="Confirm Password"
                          type="password"
                          autoComplete='new-password'
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              confirmPassword: e.target.value,
                            })
                          }
                          minLength={6}
                          required={!isEditing}
                          error={confirmPasswordError || undefined}
                        />
                      )}
                    </>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
                          setPasswordErrors([]);
                          setConfirmPasswordError('');
                          setAccessLevelValue([]);
                        }}
                        className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-medium transition-all duration-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                      >
                        {isEditing ? 'Update User' : 'Create User'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Access Level
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedDepartments?.length > 0 ? (
                        paginatedDepartments?.map((user) => (
                          <tr 
                            key={user.ID} 
                            className="hover:bg-blue-50/50 transition-colors duration-150"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                  {user.UserName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold text-gray-900">
                                  {user.UserName}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {user?.accessList?.length > 0
                                  ? user?.accessList.map((access: any) => (
                                      <span
                                        key={access.ID}
                                        className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full shadow-sm
                                        ${
                                          access?.Description === 'Administrator'
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                            : access?.Description === 'Manager'
                                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                            : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                        }`}
                                      >
                                        {access?.Description || 'User'}
                                      </span>
                                    ))
                                  : (
                                    <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-gray-200 text-gray-600">
                                      No Access
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                {userPagePermissions?.Edit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg px-3 py-2 transition-all duration-200"
                                    onClick={() => handleEditClick(user)}
                                  >
                                    <Edit className="h-4 w-4" />
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
                                      className="text-red-600 hover:text-white hover:bg-red-600 rounded-lg px-3 py-2 transition-all duration-200"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DeleteDialog>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-6 py-16 text-center"
                          >
                            <div className="flex flex-col items-center space-y-3">
                              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                                <Search className="h-8 w-8 text-gray-400" />
                              </div>
                              <p className="text-gray-500 font-medium">
                                {searchTerm ? 'No users found matching your search' : 'No users found'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {filteredUsers && filteredUsers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
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
          )}
        </div>
      </div>
    </div>
  );
};
