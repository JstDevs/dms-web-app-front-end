// pages/UserAccessPage.tsx
import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import toast from "react-hot-toast";
import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";
import usePermissions from "./usePermission";
import useRoles from "./useRoles";
import RoleDropdown from "./RoleDrop";
import PermissionsTable from "./PermissionTable";

// import usePermissions from '../hooks/usePermissions';
// import useRoles from '../hooks/useRoles';
// import RoleDropdown from '../components/RoleDropdown';
// import PermissionsTable from '../components/PermissionsTable';

const UserAccessPage = () => {
  const { permissions, isLoading } = usePermissions();
  const {
    roles,
    addRole,
    updatePermission,
    toggleAllPermissions,
    resetToOriginal,
    saveChanges,
    hasChanges,
  } = useRoles(permissions);

  const [selectedRole, setSelectedRole] = useState("Administrator");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const currentRole = roles.find((r) => r.role === selectedRole);

  const handleAddNewRole = () => {
    if (addRole(newRoleName)) {
      setSelectedRole(newRoleName);
      setNewRoleName("");
      setIsDialogOpen(false);
    } else {
      toast.error("Role name already exists or is invalid");
    }
  };

  const handleSave = () => {
    saveChanges();
    toast.success("Changes saved successfully!");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading permissions...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg">
      <header className="text-left flex-1 py-4 px-6">
        <h1 className="text-3xl font-bold text-blue-800">User Access</h1>
        <p className="text-gray-600 mt-2">
          Manage user permissions and access levels
        </p>
      </header>

      <div className="p-6">
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

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={resetToOriginal}
          >
            Cancel
          </Button>
          <Button
            className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 ${
              hasChanges
                ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                : "bg-gray-300 cursor-not-allowed"
            }`}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <Dialog.Root
        lazyMount
        open={isDialogOpen}
        onOpenChange={(e) => setIsDialogOpen(e.open)}
        placement={"center"}
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
