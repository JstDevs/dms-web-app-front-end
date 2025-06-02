import { useEffect, useState } from "react";
import { FiSearch, FiChevronDown } from "react-icons/fi";
import toast from "react-hot-toast";
import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";
type Permission = {
  name: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
};

type UserAccess = {
  role: string;
  permissions: Permission[];
};

const permissionNames = [
  "User",
  "User Access",
  "Department",
  "Digitization Documents",
  "Sub-Department",
  "Fields",
  "Batch Upload",
  "Allocation",
  "Fields Export to Excel",
  "OCR Template",
  "Blank / Unallocated",
  "OCR Unrecorded",
];

const generateDefaultPermissions = (): Permission[] =>
  permissionNames.map((name) => ({
    name,
    view: false,
    add: false,
    edit: false,
    delete: false,
    print: false,
  }));

const defaultRoles: UserAccess[] = [
  {
    role: "Administrator",
    permissions: generateDefaultPermissions().map((p) => ({
      ...p,
      view: true,
      add: true,
      edit: true,
      delete: true,
      print: true,
    })),
  },
  {
    role: "Manager",
    permissions: generateDefaultPermissions().map((p) => ({
      ...p,
      view: true,
      add: true,
    })),
  },
  {
    role: "User",
    permissions: generateDefaultPermissions().map((p) => ({
      ...p,
      view: true,
    })),
  },
];

const UserAccessPage = () => {
  const [rolesData, setRolesData] = useState<UserAccess[]>(defaultRoles);
  const [originalRolesData, setOriginalRolesData] =
    useState<UserAccess[]>(defaultRoles);
  const [selectedRole, setSelectedRole] = useState("Administrator");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(
      JSON.stringify(rolesData) !== JSON.stringify(originalRolesData)
    );
  }, [rolesData, originalRolesData]);

  const currentRoleData = rolesData.find((r) => r.role === selectedRole)!;

  const filteredPermissions = currentRoleData.permissions.filter((permission) =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckboxChange = (
    permissionName: string,
    field: keyof Permission
  ) => {
    setRolesData((prev) =>
      prev.map((role) =>
        role.role === selectedRole
          ? {
              ...role,
              permissions: role.permissions.map((perm) =>
                perm.name === permissionName
                  ? { ...perm, [field]: !perm[field] }
                  : perm
              ),
            }
          : role
      )
    );
  };

  const handleAddNewRole = () => {
    if (
      newRoleName &&
      !rolesData.some((r) => r.role.toLowerCase() === newRoleName.toLowerCase())
    ) {
      const newRole: UserAccess = {
        role: newRoleName,
        permissions: generateDefaultPermissions(),
      };
      const updatedRoles = [...rolesData, newRole];
      setRolesData(updatedRoles);
      setSelectedRole(newRoleName);
      setNewRoleName("");
      setIsDialogOpen(false);
    }
  };

  const handleSave = () => {
    setOriginalRolesData(rolesData);
    setHasChanges(false);
    toast.success("Changes saved successfully!");
  };
  const handleCancel = () => {
    // Reset to original data
    setRolesData(originalRolesData);
    // If the currently selected role was a new unsaved role, switch back to Administrator
    if (!originalRolesData.some((r) => r.role === selectedRole)) {
      setSelectedRole("Administrator");
    }
    setHasChanges(false);
  };
  const handleToggleAll = (field: keyof Permission) => {
    const currentPermissions = currentRoleData.permissions;
    const allChecked = currentPermissions.every((perm) => perm[field]);

    setRolesData((prev) =>
      prev.map((role) =>
        role.role === selectedRole
          ? {
              ...role,
              permissions: role.permissions.map((perm) => ({
                ...perm,
                [field]: !allChecked,
              })),
            }
          : role
      )
    );
  };
  return (
    <div className="flex flex-col  bg-white rounded-md shadow-lg">
      <header className="text-left flex-1 py-4 px-6">
        <h1 className="text-3xl font-bold text-blue-800">User Access</h1>
        <p className="text-gray-600 mt-2">
          Manage user permissions and access levels
        </p>
      </header>

      <div className="p-6">
        {/* Controls */}
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

          {/* Role dropdown */}
          <div className="relative w-full md:w-auto">
            <button
              className="flex items-center justify-between w-full md:w-48 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedRole}</span>
              <FiChevronDown
                className={`ml-2 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full md:w-48 bg-white shadow-lg rounded-md py-1 border border-gray-200">
                {rolesData.map((role) => (
                  <button
                    key={role.role}
                    className={`block w-full text-left px-4 py-2 hover:bg-blue-50 ${
                      selectedRole === role.role
                        ? "bg-blue-100 text-blue-800"
                        : "text-gray-700"
                    }`}
                    onClick={() => {
                      setSelectedRole(role.role);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {role.role}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setIsDialogOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-100"
                >
                  + Add New Role
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Permissions Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                  Description
                </th>
                {["View", "Add", "Edit", "Delete", "Print"].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-center text-xs font-medium text-blue-800 uppercase tracking-wider"
                  >
                    <div className="flex flex-col items-center">
                      <span>{col}</span>
                      <input
                        type="checkbox"
                        checked={currentRoleData.permissions.every(
                          (perm) => perm[col.toLowerCase() as keyof Permission]
                        )}
                        onChange={() =>
                          handleToggleAll(col.toLowerCase() as keyof Permission)
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPermissions.map((perm) => (
                <tr key={perm.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {perm.name}
                  </td>
                  {(["view", "add", "edit", "delete", "print"] as const).map(
                    (field) => (
                      <td
                        key={field}
                        className="px-6 py-4 whitespace-nowrap text-center"
                      >
                        <input
                          type="checkbox"
                          checked={perm[field]}
                          onChange={() =>
                            handleCheckboxChange(perm.name, field)
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            // onClick={() => {

            //   setRolesData(originalRolesData);
            //   setHasChanges(false);
            // }}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 ${
              hasChanges
                ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                : "bg-gray-300 cursor-not-allowed"
            }`}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Add Role Dialog */}
      {/* <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-bold text-gray-800 mb-2">
              Add New Role
            </Dialog.Title>
            <input
              type="text"
              placeholder="Enter role name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewRole}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Add Role
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog> */}
      <Dialog.Root
        lazyMount
        open={isDialogOpen}
        onOpenChange={(e) => setIsDialogOpen(e.open)}
      >
        <Dialog.Trigger asChild>
          <Button variant="outline">Open</Button>
        </Dialog.Trigger>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title> Add New Role</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {/* <Lorem p={2} /> */}
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Eveniet, numquam voluptatibus, doloremque aperiam natus debitis
                voluptate ratione pariatur ea odio nisi, quam dolorem
                consequatur quo ab modi minima id laboriosam!
                <input
                  type="text"
                  placeholder="Enter role name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </Dialog.ActionTrigger>
                <Button onClick={handleAddNewRole}> Add Role</Button>
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
{
  /* <Dialog
  open={isDialogOpen}
  onClose={() => setIsDialogOpen(false)}
  className="relative z-50"
>
  <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <Dialog.Panel className="mx-auto w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
      <Dialog.Title className="text-lg font-bold text-gray-800 mb-2">
        Add New Role
      </Dialog.Title>
      <input
        type="text"
        placeholder="Enter role name"
        className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={newRoleName}
        onChange={(e) => setNewRoleName(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsDialogOpen(false)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleAddNewRole}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Add Role
        </button>
      </div>
    </Dialog.Panel>
  </div>
</Dialog>; */
}
