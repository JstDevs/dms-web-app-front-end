import { PlusCircle, Trash2, Pencil, Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FieldSettingsPanel } from '../FieldSetting';
import { Button } from '@chakra-ui/react';
// import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import useAccessLevelRole from '../Users/Users Access/useAccessLevelRole';
import { useOCRFields } from '../OCR/Fields/useOCRFields';
import toast from 'react-hot-toast';
import { allocateFieldsToUsers } from './utils/allocationServices';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { useUsers } from '../Users/useUser';
type PermissionKey =
  | 'view'
  | 'add'
  | 'edit'
  | 'delete'
  | 'print'
  | 'confidential';

type UserPermission = {
  username: string;
  isEditing?: boolean;
} & Record<PermissionKey, boolean>;
type updatedFields = {
  ID: number;
  Field: string;
  Type: string;
  Description: string;
}[];
export const AllocationPanel = () => {
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSubDept, setSelectedSubDept] = useState('');
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserID, setNewUserID] = useState('');
  const [savedFieldsData, setSavedFieldsData] = useState<updatedFields>([]);

  // const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const {
    departmentOptions,
    getSubDepartmentOptions,
    loading: loadingDepartments,
  } = useNestedDepartmentOptions();
  const { accessOptions } = useAccessLevelRole();
  const { users: usersList } = useUsers();
  const { fields, loading, error } = useOCRFields();
  const fieldPanelRef = useRef<any>(null);

  const [subDepartmentOptions, setSubDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const allocationPermissions = useModulePermissions(7); // 1 = MODULE_ID
  // Update sub-departments when department selection changes
  // useEffect(() => {
  //   if (selectedDept) {
  //     const selectedDeptId = departmentOptions.find(
  //       (dept) => dept.label === selectedDept
  //     )?.value;

  //     if (selectedDeptId) {
  //       const subs = getSubDepartmentOptions(Number(selectedDeptId));
  //       setSubDepartmentOptions(subs);
  //       setSelectedSubDept(''); // Reset sub-department when department changes
  //     }
  //   } else {
  //     setSubDepartmentOptions([]);
  //     setSelectedSubDept('');
  //   }
  // }, [selectedDept, departmentOptions, getSubDepartmentOptions]);
  useEffect(() => {
    if (selectedDept && departmentOptions.length > 0) {
      // const selectedDeptId = departmentOptions.find(
      //   (dept) => dept.label === selectedDept
      // )?.value;

      if (selectedDept) {
        const subs = getSubDepartmentOptions(Number(selectedDept));
        setSubDepartmentOptions(subs);
        // Only reset if the current subDept doesn't exist in new options
        if (!subs.some((sub) => sub.value === selectedSubDept)) {
          setSelectedSubDept('');
        }
      }
    } else {
      setSubDepartmentOptions([]);
      if (selectedSubDept) {
        // Only reset if there's a value
        setSelectedSubDept('');
      }
    }
  }, [selectedDept, departmentOptions]);
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
    console.log('Saved user:', username, users);
  };

  const addUser = () => {
    // FINDING THE SELECTED ACCESS LEVEL
    // const newUserLabel = accessOptions?.items?.find(
    //   (item: any) => item.value === newUsername
    // ) as { value: string; label: string };
    const newUserLabel = usersList?.find(
      (item: any) => Number(item.ID) === Number(newUserID)
    );
    // CHECKING IF THE USER ALREADY EXISTS
    if (users.some((u) => u.username === newUserLabel?.UserName)) {
      toast.error('User already exists');
      return;
    }
    console.log({ usersList });
    // ADDING THE NEW USER
    setUsers([
      ...users,
      {
        username: newUserLabel?.UserName || '',
        view: true,
        add: false,
        edit: false,
        delete: false,
        print: false,
        confidential: false,
        isEditing: false,
      },
    ]);

    setNewUserID('');
    setShowAddUser(false);
  };

  const removeUser = (username: string) => {
    if (username !== 'admin') {
      setUsers(users.filter((user) => user.username !== username));
    }
  };

  const handleAllocation = async () => {
    const user = users[0];

    const userID = (usersList || [])?.find(
      (item) => item.UserName === user.username
    )?.ID;

    if (!userID || !selectedDept || !selectedSubDept) {
      toast.error('Invalid user or department selection.');
      return;
    }

    const payload = {
      depid: Number(selectedDept),
      subdepid: Number(selectedSubDept),
      userid: Number(userID),
      View: user.view,
      Add: user.add,
      Edit: user.edit,
      Delete: user.delete,
      Print: user.print,
      Confidential: user.confidential,
      fields: savedFieldsData.map((field) => ({
        ID: Number(field.ID),
        Field: field.Field,
        Type: field.Type,
        Description: field.Description || '',
      })),
    };

    try {
      await allocateFieldsToUsers(payload);
      toast.success('Allocation successful');
    } catch (error: any) {
      console.error('Allocation failed:', error);
      toast.error(
        'Failed to allocate : ' + error?.response?.data?.error ||
          'Please try again.'
      );
    } finally {
      setSavedFieldsData([]);
      setUsers([]);
      setSelectedDept('');
      setSelectedSubDept('');
      setShowAddUser(false);
      setNewUserID('');
      // 🔁 Trigger reset in child component
      fieldPanelRef.current?.cancelFields?.();
    }
  };
  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  console.log({ selectedDept });
  const userOptions = usersList?.map((user) => ({
    label: user.UserName,
    value: user.ID,
  }));
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
        <div className="w-full xl:w-1/2 sm:border sm:rounded-md sm:p-4 sm:bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-800">
              Field Settings
            </h2>
            {/* <SlidersHorizontal className="w-5 h-5 text-blue-600" /> */}
          </div>
          <FieldSettingsPanel
            ref={fieldPanelRef}
            fieldsInfo={fields}
            onSave={(updatedFields) => {
              setSavedFieldsData(updatedFields);
              // 🔁 Handle save to backend or store here
              console.log('Received from child:', updatedFields);
              toast.success('Fields saved successfully');
            }}
            onCancel={(resetFields) => {
              setSavedFieldsData(resetFields);
            }}
          />
        </div>

        {/* Right Panel - User Permissions */}
        <div className="w-full xl:w-1/2 space-y-6">
          {/* Department Selection */}
          <div className="sm:border sm:rounded-md sm:p-4 sm:bg-blue-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Department *
                </label>
                {/* <select
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
                </select> */}
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-sm"
                  disabled={loadingDepartments}
                >
                  <option value="" hidden>
                    {loadingDepartments
                      ? 'Loading departments...'
                      : 'Select Department'}
                  </option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Sub-Department *
                </label>
                {/* <select
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
                </select> */}
                <select
                  value={selectedSubDept}
                  onChange={(e) => setSelectedSubDept(e.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-sm"
                  disabled={!selectedDept || subDepartmentOptions.length === 0}
                >
                  <option value="" hidden>
                    {!selectedDept
                      ? 'Select department first'
                      : subDepartmentOptions.length === 0
                      ? 'No sub-departments available'
                      : 'Select Sub-Department'}
                  </option>
                  {subDepartmentOptions.map((sub) => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Add User Form */}
          {showAddUser ? (
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-md sm:flex-nowrap flex-wrap">
              <select
                value={newUserID}
                onChange={(e) => setNewUserID(e.target.value)}
                className="flex-1 px-4 py-2 rounded-md bg-white border border-gray-300 text-sm"
              >
                <option value="" hidden>
                  Select user to add
                </option>
                {userOptions?.map((user: any) => (
                  <option key={user.value} value={user.value}>
                    {user.label}
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
          ) : (
            <div className="flex gap-2">
              {allocationPermissions?.Add && (
                <Button
                  onClick={() => setShowAddUser(true)}
                  disabled={showAddUser || users.length === 1}
                  className={`flex max-sm:w-full items-center gap-1 px-4 py-2 rounded-md text-sm ${
                    showAddUser || users.length === 1
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add User
                </Button>
              )}
            </div>
          )}

          {/* Permissions Table */}
          {users.length > 0 && (
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
                        user.isEditing ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">{user.username}</td>
                      {(
                        [
                          'view',
                          'add',
                          'edit',
                          'delete',
                          'print',
                          'confidential',
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
                              (!user.isEditing && user.username !== 'admin') ||
                              user.username === 'admin'
                            }
                            className={`h-4 w-4 ${
                              user.username === 'admin'
                                ? 'cursor-not-allowed'
                                : ''
                            }`}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-center">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex gap-2 mt-4 border-t border-gray-200 pt-4">
            <Button
              onClick={handleAllocation}
              disabled={
                !Boolean(selectedSubDept) ||
                !Boolean(selectedDept) ||
                users.length === 0 ||
                savedFieldsData.length === 0
              }
              className={`flex max-sm:w-full items-center gap-1 px-4 py-2 rounded-md text-sm font-medium
                 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
                 bg-blue-600 text-white hover:bg-blue-700
              `}
            >
              <PlusCircle className="w-4 h-4" />
              Allocate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
