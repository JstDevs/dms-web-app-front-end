// components/PermissionsTable.tsx

import { Permission } from "./usePermission";

type PermissionsTableProps = {
  permissions: Permission[];
  onPermissionChange: (permissionId: number, field: keyof Permission) => void;
  onToggleAll: (field: keyof Permission) => void;
  searchTerm: string;
};

const PermissionsTable = ({
  permissions,
  onPermissionChange,
  onToggleAll,
  searchTerm,
}: PermissionsTableProps) => {
  const filteredPermissions = permissions.filter((permission) =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // console.log(filteredPermissions, "filteredPermissions", permissions);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">
              Description
            </th>
            {["View", "Add", "Edit", "Delete", "Print"].map((col) => (
              <th
                key={col}
                className="px-6 py-3 text-center text-base font-semibold text-gray-700 uppercase tracking-wider"
              >
                <div className="flex justify-center  flex-col items-center">
                  <span>{col}</span>
                  <input
                    type="checkbox"
                    checked={permissions.every(
                      (perm) => perm[col.toLowerCase() as keyof Permission]
                    )}
                    onChange={() =>
                      onToggleAll(col.toLowerCase() as keyof Permission)
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
            <tr key={perm.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm  text-gray-900">
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
                      onChange={() => onPermissionChange(perm.id, field)}
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
  );
};

export default PermissionsTable;
