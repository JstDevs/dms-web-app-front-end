import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
// import { Button } from "../../components/ui/Button";
import { Search, Edit, Trash2, UserPlus } from "lucide-react";
import { DeleteDialog } from "../../components/ui/DeleteDialog";
import { User } from "@/types/User";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Button } from "@chakra-ui/react";
import { useUsers } from "./useUser";
import toast from "react-hot-toast";
export const UsersPage: React.FC = () => {
  const { users, loading, error, refetch } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    accessId: "user",
    password: "",
    confirmPassword: "",
  });
  // const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  // ------------------FORM REF TO MOVE TO TOP ---------------
  const formRef = useRef<HTMLDivElement>(null);
  // -------------------FILTER USERS -----------------
  const filteredUsers = users?.filter((user) =>
    user.UserName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedDepartments = filteredUsers?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // setError(null);

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // const newUser: User = {
    //   id: (users.length + 1).toString(),
    //   username: formData.username,
    //   accessId: formData.accessId,
    // };

    // setUsers([...users, newUser]);
    setFormData({
      username: "",
      accessId: "user",
      password: "",
      confirmPassword: "",
    });
    setIsCreating(false);
  };

  const handleEditClick = (user: User) => {
    setCurrentUser(user);
    // setFormData({
    // username: user.username,
    // accessId: user.accessId,
    // password: "",
    // confirmPassword: "",
    // });
    setIsEditing(true);
    setIsCreating(false);

    // Scroll to the form after rendering
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100); // slight delay ensures DOM updates
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // setError(null);

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (currentUser) {
      // const updatedUsers = users.map((user) =>
      //   user.id === currentUser.id
      //     ? {
      //         ...user,
      //         username: formData.username,
      //         accessId: formData.accessId,
      //       }
      //     : user
      // );

      // setUsers(updatedUsers);
      setFormData({
        username: "",
        accessId: "user",
        password: "",
        confirmPassword: "",
      });
      setIsEditing(false);
      setCurrentUser(null);
    }
  };

  const handleDelete = (id: number) => {
    // setUsers(users.filter((user) => user.id !== id));
  };

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg p-2 sm:p-6">
      <header className="flex justify-between items-center gap-4 flex-wrap">
        <div className="text-left flex-1 ">
          <h1 className="text-3xl font-bold text-blue-800">Users</h1>
          <p className="mt-2 text-gray-600">
            Manage system users and access permissions
          </p>
        </div>

        <div className="w-full sm:w-auto">
          {!isCreating && !isEditing && (
            <Button
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
                setFormData({
                  username: "",
                  accessId: "user",
                  password: "",
                  confirmPassword: "",
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
            <CardTitle>System Users</CardTitle>
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
          <section>
            {(isCreating || isEditing) && (
              <div className="mb-6 p-4 border rounded-md" ref={formRef}>
                <h3 className="text-lg font-medium mb-4">
                  {isEditing ? "Edit User" : "Create User"}
                </h3>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <form
                  onSubmit={isEditing ? handleEditSubmit : handleCreateSubmit}
                  className="space-y-4"
                >
                  <Input
                    label="Username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                  />
                  <Select
                    label="Access Level"
                    value={formData.accessId}
                    onChange={(e) =>
                      setFormData({ ...formData, accessId: e.target.value })
                    }
                    options={[
                      { value: "user", label: "User" },
                      { value: "manager", label: "Manager" },
                      { value: "admin", label: "Administrator" },
                    ]}
                  />
                  <Input
                    label={
                      isEditing
                        ? "New Password (leave blank to keep current)"
                        : "Password"
                    }
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={!isEditing}
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
                          username: "",
                          accessId: "user",
                          password: "",
                          confirmPassword: "",
                        });
                      }}
                      className="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 px-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-2"
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
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Username
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Access Level
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedDepartments?.length > 0 ? (
                    paginatedDepartments?.map((user) => (
                      <tr key={user.ID} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.UserName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${
                              user.userAccess.Description === "Administration"
                                ? "bg-blue-100 text-blue-800"
                                : user.userAccess.Description === "Manager"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {/* {user.UserAccessID.charAt(0).toUpperCase() +
                              user.UserAccessID.slice(1)} */}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900 mr-2"
                            onClick={() => handleEditClick(user)}
                            disabled={
                              user.userAccess.Description === "Administration"
                            }
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <DeleteDialog
                            key={user.ID}
                            onConfirm={() => handleDelete(user.ID)}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-900"
                              disabled={
                                user.userAccess.Description === "Administration"
                              }
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
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <PaginationControls
            currentPage={currentPage}
            totalItems={users?.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}
    </div>
  );
};
