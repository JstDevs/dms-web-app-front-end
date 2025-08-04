// pages/UserAccessPage.tsx
import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Button, CloseButton, Dialog, Portal } from '@chakra-ui/react';
import usePermissions from './usePermission';
import useRoles from './useRoles';
import RoleDropdown from './RoleDrop';
import PermissionsTable from './PermissionTable';
import {
  addUserAccess,
  AddUserAccessPayload,
  deleteUserAccessRole,
  editUserAccess,
  EditUserAccessPayload,
} from './userAccessService';
// import { Trash2 } from "lucide-react";
import { DeleteDialog } from '@/components/ui/DeleteDialog';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';

const UserAccessPage = () => {
  const { permissions, isLoading: isPermissionsLoading } = usePermissions();
  const {
    roles,
    originalRoles,
    addRole,
    updatePermission,
    toggleAllPermissions,
    removeRole,
    resetToOriginal,
    saveChanges,
    hasChanges,
    isInitialized,
  } = useRoles(permissions);
  const [selectedRole, setSelectedRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const currentRole = roles.find((r) => r.role === selectedRole);
  const userAccessPermissions = useModulePermissions(6); // 1 = MODULE_ID
  // console.log({ selectedRole, currentRole, originalRoles });
  const handleAddNewRole = () => {
    if (addRole(newRoleName)) {
      setSelectedRole(newRoleName);
      setNewRoleName('');
      setIsDialogOpen(false);
    } else {
      toast.error('Role name already exists or is invalid');
    }
  };
  console.log(roles);
  const handleAddNewRoleBackend = async () => {
    if (!currentRole) {
      toast.error('No role selected');
      return;
    }

    const payload: AddUserAccessPayload = {
      description: currentRole?.role || '',
      modulePermissions: currentRole?.permissions?.map((perm) => ({
        ID: String(perm.id),
        Description: perm.name,
        view: perm.view,
        add: perm.add,
        edit: perm.edit,
        delete: perm.delete,
        print: perm.print,
      })),
    };
    try {
      const res = await addUserAccess(payload);
      console.log(res.data, 'addUserAccess');
      if (res.success) {
        saveChanges();
        currentRole.userAccessID = res.data.id;
        toast.success('Changes saved successfully!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes');
    }
  };
  // console.log(roles);
  const handleSaveChanges = async () => {
    if (!currentRole) {
      toast.error('No role selected');
      return;
    }

    const payload: EditUserAccessPayload = {
      currentDescription: currentRole?.role || '',
      description: currentRole?.role || '',
      modulePermissions: currentRole?.permissions?.map((perm) => ({
        ID: String(perm.id),
        Description: perm.name,
        view: perm.view,
        add: perm.add,
        edit: perm.edit,
        delete: perm.delete,
        print: perm.print,
      })),
    };
    console.log(currentRole, payload, 'EDIT USER ACCESS');
    try {
      const res = await editUserAccess(payload, currentRole.userAccessID);
      if (res.success) {
        saveChanges(); // THIS WAS MISSING! This updates originalRoles to match current roles
        toast.success('Changes saved successfully!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes');
    }
  };

  // Check if current role is new (not in original roles)
  const isNewRole = !originalRoles.some((r) => r.role === selectedRole);
  console.log(isNewRole, originalRoles, roles);
  const handleCancel = () => {
    if (isNewRole) {
      removeRole(selectedRole);
      setSelectedRole('');
      toast.success(`New role "${selectedRole}" removed`);
    } else {
      resetToOriginal();
      toast.success('Changes reverted');
    }
  };
  // console.log({ selectedRole });
  const handleDelete = async (id: number) => {
    try {
      const res = await deleteUserAccessRole(id);

      if (!res.success) {
        toast.error('Failed to delete role');
        return;
      }
      console.log(res.data, 'deleteUserAccessRole', selectedRole);
      removeRole(selectedRole);
      setSelectedRole('');

      toast.success(`Role "${selectedRole}" deleted successfully!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete role');
    }
  };
  // console.log(isPermissionsLoading, !isInitialized);
  if (isPermissionsLoading || !isInitialized) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading permissions...</p>
          <p className="text-slate-500 text-sm mt-2">
            Please add modules first if none exist
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg">
      <header className="text-left flex-1 py-4 sm:px-6 px-3">
        <h1 className="text-3xl font-bold text-blue-800">User Access</h1>
        <p className="text-gray-600 mt-2">
          Manage user permissions and access levels
        </p>
      </header>

      <div className="p-3 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-64">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <RoleDropdown
            roles={roles}
            selectedRole={selectedRole}
            onSelect={setSelectedRole}
            onAddNew={() => setIsDialogOpen(true)}
          />
        </div>

        {currentRole && (
          <PermissionsTable
            permissions={currentRole.permissions}
            onPermissionChange={(id, field) =>
              updatePermission(selectedRole, id, field)
            }
            onToggleAll={(field) => toggleAllPermissions(selectedRole, field)}
            searchTerm={searchTerm}
          />
        )}

        {selectedRole ? (
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            {userAccessPermissions?.Delete && (
              <DeleteDialog
                key={selectedRole}
                onConfirm={() => handleDelete(currentRole?.userAccessID || 0)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-red-700 bg-red-600 p-5 "
                >
                  Delete Role
                </Button>
              </DeleteDialog>
            )}
            {userAccessPermissions?.Edit && (
              <Button
                className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 ${
                  hasChanges
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                onClick={
                  isNewRole ? handleAddNewRoleBackend : handleSaveChanges
                }
                disabled={!hasChanges}
              >
                {isNewRole ? 'Add Role and Save' : 'Save Changes'}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <h1 className="text-3xl font-bold text-blue-800">
              {' '}
              No role selected{' '}
            </h1>
          </div>
        )}
      </div>

      <Dialog.Root
        lazyMount
        open={isDialogOpen}
        onOpenChange={(e) => setIsDialogOpen(e.open)}
        placement={'center'}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content className="bg-white mx-4">
              <Dialog.Header>
                <Dialog.Title className="text-2xl font-semibold">
                  Add New Role
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <input
                  type="text"
                  placeholder="Enter role name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </Dialog.Body>
              <Dialog.Footer className="flex justify-end border-t border-gray-200 gap-4">
                <Dialog.ActionTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 px-2"
                  >
                    Cancel
                  </Button>
                </Dialog.ActionTrigger>
                <Button
                  onClick={handleAddNewRole}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-2"
                  disabled={!newRoleName}
                >
                  Add Role
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
};

export default UserAccessPage;
