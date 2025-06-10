import {
  PlusCircle,
  Trash2,
  Pencil,
  Save,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { FieldSettingsPanel } from "../FieldSetting";
import { Button } from "@chakra-ui/react";
import { useDepartmentOptions } from "@/hooks/useDepartmentOptions";

type PermissionKey =
  | "view"
  | "add"
  | "edit"
  | "delete"
  | "print"
  | "confidential";

type UserPermission = {
  username: string;
  isEditing?: boolean;
} & Record<PermissionKey, boolean>;

const mockUsers = ["admin", "manager", "users", "hr"];

const defaultPermissions = {
  view: true,
  add: true,
  edit: true,
  delete: true,
  print: true,
  confidential: true,
};

export const AllocationPanel = () => {
  const [selectedDept, setSelectedDept] = useState("Payroll");
  const [selectedSubDept, setSelectedSubDept] = useState("SAMPLE DOCUMENTS");
  const [showFieldsPanel, setShowFieldsPanel] = useState(false);
  const [users, setUsers] = useState<UserPermission[]>([
    {
      username: "admin",
      ...defaultPermissions,
    },
  ]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  // const departments = ["Payroll", "HR", "Finance"];
  // const subDepartments = ["SAMPLE DOCUMENTS", "CONTRACTS", "REPORTS"];
  const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const togglePermission = (username: string, field: PermissionKey) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.username === username ? { ...user, [field]: !user[field] } : user
      )
    );
  };

  const toggleEditMode = (username: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.username === username
          ? { ...user, isEditing: !user.isEditing }
          : { ...user, isEditing: false }
      )
    );
  };

  const saveUser = (username: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.username === username ? { ...user, isEditing: false } : user
      )
    );
  };

  const addUser = () => {
    if (newUsername && !users.some((u) => u.username === newUsername)) {
      setUsers([
        ...users,
        {
          username: newUsername,
          view: true,
          add: false,
          edit: false,
          delete: false,
          print: false,
          confidential: false,
          isEditing: false,
        },
      ]);
      setNewUsername("");
      setShowAddUser(false);
    }
  };

  const removeUser = (username: string) => {
    if (username !== "admin") {
      setUsers(users.filter((user) => user.username !== username));
    }
  };

  const handleSubDeptAdd = () => {
    // const name = prompt("Enter Sub-Department name:");
    // if (name) alert(`Sub-Department "${name}" added.`);
  };

  const handleSubDeptDelete = () => {
    // const confirmDelete = confirm(
    //   `Are you sure you want to delete "${selectedSubDept}"?`
    // );
    // if (confirmDelete) alert(`Sub-Department "${selectedSubDept}" deleted.`);
  };

  return (
    <div className="bg-white shadow-md rounded-xl p-3 md:p-6 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center gap-2 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">Allocation</h1>
          <p className="mt-2 text-gray-600">
            Allocate user access and fields to documents
          </p>
        </div>
      </header>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Panel - Fields Settings */}
        <div className="w-full xl:w-1/2 border rounded-md p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-800">
              Field Settings
            </h2>
            {/* <SlidersHorizontal className="w-5 h-5 text-blue-600" /> */}
          </div>
          <FieldSettingsPanel setShowFieldsPanel={setShowFieldsPanel} />
        </div>

        {/* Right Panel - User Permissions */}
        <div className="w-full xl:w-1/2 space-y-6">
          {/* Department Selection */}
          <div className="border rounded-md p-4 bg-blue-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-sm"
                >
                  <option value="" hidden>
                    Select Department
                  </option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.value}>{dept.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Sub-Department
                </label>
                <select
                  value={selectedSubDept}
                  onChange={(e) => setSelectedSubDept(e.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-sm"
                >
                  <option value="" hidden>
                    Select Sub-Department
                  </option>
                  {subDepartmentOptions.map((sub) => (
                    <option key={sub.value}>{sub.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-md sm:flex-nowrap flex-wrap">
              <select
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="flex-1 px-4 py-2 rounded-md bg-white border border-gray-300 text-sm"
              >
                <option value="">Select user to add</option>
                {mockUsers
                  .filter((user) => !users.some((u) => u.username === user))
                  .map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
              </select>

              <Button
                onClick={addUser}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 sm:w-auto w-full"
              >
                Add
              </Button>
              <Button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm hover:bg-gray-300 sm:w-auto w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Permissions Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border rounded-md text-sm">
              <thead className="bg-gray-50 text-black">
                <tr>
                  <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-center text-base font-semibold text-gray-700 uppercase tracking-wider">
                    View
                  </th>
                  <th className="px-6 py-3 text-center text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Add
                  </th>
                  <th className="px-6 py-3 text-center text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Edit
                  </th>
                  <th className="px-6 py-3 text-center text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Delete
                  </th>
                  <th className="px-6 py-3 text-center text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Print
                  </th>
                  <th className="px-6 py-3 text-center text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Confidential
                  </th>
                  <th className="px-6 py-3 text-center text-base font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.username}
                    className={`bg-white text-gray-700 ${
                      user.isEditing ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-medium">{user.username}</td>
                    {(
                      [
                        "view",
                        "add",
                        "edit",
                        "delete",
                        "print",
                        "confidential",
                      ] as PermissionKey[]
                    ).map((field) => (
                      <td key={field} className="text-center">
                        <input
                          type="checkbox"
                          checked={user[field]}
                          onChange={() =>
                            togglePermission(user.username, field)
                          }
                          disabled={
                            (!user.isEditing && user.username !== "admin") ||
                            user.username === "admin"
                          }
                          className={`h-4 w-4 ${
                            user.username === "admin"
                              ? "cursor-not-allowed"
                              : ""
                          }`}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center">
                      {user.username !== "admin" && (
                        <div className="flex justify-center gap-2">
                          {user.isEditing ? (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => saveUser(user.username)}
                                className="text-green-600 hover:text-green-800 bg-gray-50 hover:bg-gray-100"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => toggleEditMode(user.username)}
                                className="text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => toggleEditMode(user.username)}
                                className="text-blue-600 hover:text-blue-800 bg-gray-50 hover:bg-gray-100"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => removeUser(user.username)}
                                className="text-red-600 hover:text-red-800 bg-gray-50 hover:bg-gray-100"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddUser(true)}
              disabled={showAddUser || mockUsers.length === users.length}
              className={`flex max-sm:w-full items-center gap-1 px-4 py-2 rounded-md text-sm ${
                showAddUser || mockUsers.length === users.length
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
