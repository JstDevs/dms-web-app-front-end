import { FiChevronDown } from 'react-icons/fi';
import { useState } from 'react';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';

type RoleDropdownProps = {
  roles: { role: string }[];
  selectedRole: string;
  onSelect: (role: string) => void;
  onAddNew: () => void;
};

const RoleDropdown = ({
  roles,
  selectedRole,
  onSelect,
  onAddNew,
}: RoleDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const userAccessPermissions = useModulePermissions(6); // 1 = MODULE_ID
  const handleSelect = (role: string) => {
    if (role === 'Select Role') return; // Do nothing
    onSelect(role);
    setIsOpen(false);
  };

  const dropdownOptions = [...roles];

  return (
    <div className="relative w-full md:w-auto">
      <button
        className="flex items-center justify-between w-full md:w-48 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedRole || 'Select Role'}</span>
        <FiChevronDown
          className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full md:w-48 bg-white shadow-lg rounded-md py-1 border border-gray-200 max-h-60 overflow-y-auto">
          {dropdownOptions.map((role) => (
            <button
              key={role.role}
              disabled={role.role === 'Select Role'}
              className={`block w-full text-left px-4 py-2 hover:bg-blue-50 ${
                selectedRole === role.role
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-700'
              } ${
                role.role === 'Select Role'
                  ? 'text-gray-400 cursor-default'
                  : ''
              }`}
              onClick={() => handleSelect(role.role)}
            >
              {role.role}
            </button>
          ))}
          {userAccessPermissions?.Add && (
            <button
              onClick={() => {
                onAddNew();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-100"
            >
              + Add New Role
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleDropdown;
