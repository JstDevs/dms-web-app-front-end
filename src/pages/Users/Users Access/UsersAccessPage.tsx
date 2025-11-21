// pages/UserAccessPage.tsx
import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { Shield, Users, Settings, Plus, Save, X, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
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
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <Shield className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-slate-700 text-lg font-semibold">Loading permissions...</p>
          <p className="text-slate-500 text-sm mt-2 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Please add modules first if none exist
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 rounded-xl shadow-xl border border-blue-100/50 overflow-hidden">
      {/* Enhanced Header */}
      <header className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-6 py-8 sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
              User Access Management
              <span className="text-sm font-normal bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                <Users className="w-4 h-4 inline mr-1" />
                {roles.length} Roles
              </span>
            </h1>
            <p className="text-blue-100 text-sm sm:text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Manage user permissions and access levels across modules
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Enhanced Search and Role Selection */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-80 group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity blur-sm"></div>
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
            <input
              type="text"
              placeholder="Search permissions..."
              className="relative w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
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
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedRole}</h2>
                    <p className="text-sm text-gray-600">
                      {currentRole.permissions.length} permissions available
                    </p>
                  </div>
                </div>
                {hasChanges && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    Unsaved changes
                  </div>
                )}
              </div>
            </div>
            <PermissionsTable
              permissions={currentRole.permissions}
              onPermissionChange={(id, field) =>
                updatePermission(selectedRole, id, field)
              }
              onToggleAll={(field) => toggleAllPermissions(selectedRole, field)}
              searchTerm={searchTerm}
            />
          </div>
        )}

        {selectedRole ? (
          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
            <Button
              className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
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
                  className="text-white hover:bg-red-700 bg-gradient-to-r from-red-600 to-red-700 px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Role
                </Button>
              </DeleteDialog>
            )}
            {userAccessPermissions?.Edit && (
              <Button
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white focus:outline-none focus:ring-2 transition-all flex items-center gap-2 shadow-md ${
                  hasChanges
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 hover:shadow-lg transform hover:-translate-y-0.5'
                    : 'bg-gray-300 cursor-not-allowed shadow-none'
                }`}
                onClick={
                  isNewRole ? handleAddNewRoleBackend : handleSaveChanges
                }
                disabled={!hasChanges}
              >
                {hasChanges && <Save className="w-4 h-4" />}
                {isNewRole ? (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Role and Save
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-64 bg-white/50 backdrop-blur-sm rounded-xl border-2 border-dashed border-gray-300">
            <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-700 mb-2">
              No Role Selected
            </h2>
            <p className="text-gray-500 text-center max-w-md px-4">
              Select a role from the dropdown above to manage permissions, or create a new role to get started.
            </p>
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
          <Dialog.Backdrop className="backdrop-blur-sm bg-black/50" />
          <Dialog.Positioner>
            <Dialog.Content className="bg-white mx-4 rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-w-md w-full">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <Dialog.Header className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <Dialog.Title className="text-2xl font-bold text-white">
                    Add New Role
                  </Dialog.Title>
                </Dialog.Header>
              </div>
              <Dialog.Body className="px-6 py-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Role Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Administrator, Manager, Viewer..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRoleName) {
                        handleAddNewRole();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Choose a descriptive name for this role
                  </p>
                </div>
              </Dialog.Body>
              <Dialog.Footer className="flex justify-end border-t border-gray-200 gap-3 px-6 py-4 bg-gray-50">
                <Dialog.ActionTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-5 py-2.5 border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </Dialog.ActionTrigger>
                <Button
                  onClick={handleAddNewRole}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!newRoleName}
                >
                  <Plus className="w-4 h-4" />
                  Add Role
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
};

export default UserAccessPage;
