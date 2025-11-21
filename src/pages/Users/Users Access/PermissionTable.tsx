// components/PermissionsTable.tsx

import { Permission } from "./usePermission";
import { Eye, Plus, Edit, Trash2, Printer, CheckCircle2 } from "lucide-react";

type PermissionsTableProps = {
  permissions: Permission[];
  onPermissionChange: (permissionId: number, field: keyof Permission) => void;
  onToggleAll: (field: keyof Permission) => void;
  searchTerm: string;
};

const columnIcons = {
  View: Eye,
  Add: Plus,
  Edit: Edit,
  Delete: Trash2,
  Print: Printer,
};

const columnColors = {
  View: "text-blue-600 bg-blue-50",
  Add: "text-green-600 bg-green-50",
  Edit: "text-amber-600 bg-amber-50",
  Delete: "text-red-600 bg-red-50",
  Print: "text-purple-600 bg-purple-50",
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
  
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              <div className="flex items-center gap-2">
                <span>Module / Permission</span>
              </div>
            </th>
            {["View", "Add", "Edit", "Delete", "Print"].map((col) => {
              const Icon = columnIcons[col as keyof typeof columnIcons];
              const colorClass = columnColors[col as keyof typeof columnColors];
              const isAllChecked = permissions.every(
                (perm) => perm[col.toLowerCase() as keyof Permission]
              );
              return (
                <th
                  key={col}
                  className="px-4 py-4 text-center border-b-2 border-gray-200"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${colorClass} font-semibold text-xs`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{col}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isAllChecked}
                        onChange={() =>
                          onToggleAll(col.toLowerCase() as keyof Permission)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 hover:bg-gray-300 peer-checked:hover:bg-blue-700 transition-colors"></div>
                    </label>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {filteredPermissions.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <Eye className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium">No permissions found</p>
                  <p className="text-xs">Try adjusting your search term</p>
                </div>
              </td>
            </tr>
          ) : (
            filteredPermissions.map((perm, index) => (
              <tr 
                key={perm.id} 
                className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-150 border-b border-gray-100"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {perm.name}
                    </span>
                  </div>
                </td>
                {(["view", "add", "edit", "delete", "print"] as const).map(
                  (field) => {
                    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
                    const Icon = columnIcons[fieldName as keyof typeof columnIcons];
                    return (
                      <td
                        key={field}
                        className="px-4 py-4 whitespace-nowrap text-center"
                      >
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={perm[field]}
                            onChange={() => onPermissionChange(perm.id, field)}
                            className="sr-only peer"
                          />
                          <div className={`w-9 h-9 rounded-lg border-2 transition-all flex items-center justify-center ${
                            perm[field] 
                              ? 'border-blue-500 bg-blue-50 shadow-sm' 
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                          } group-hover:scale-105`}>
                            {perm[field] ? (
                              <CheckCircle2 className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                            )}
                          </div>
                        </label>
                      </td>
                    );
                  }
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionsTable;
