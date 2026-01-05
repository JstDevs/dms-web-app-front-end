import { FiChevronDown } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
import { Users, Shield, Check } from 'lucide-react';

type RoleDropdownProps = {
  roles: { role: string }[];
  selectedRole: string;
  onSelect: (role: string) => void;
};

const RoleDropdown = ({
  roles,
  selectedRole,
  onSelect,
}: RoleDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (role: string) => {
    if (role === 'Select Role') return; // Do nothing
    onSelect(role);
    setIsOpen(false);
  };

  const dropdownOptions = [...roles];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full md:w-auto" ref={dropdownRef}>
      <button
        className="flex items-center justify-between w-full md:w-64 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-blue-300 hover:shadow-md group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <span className={`font-medium truncate ${selectedRole ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedRole || 'Select Role'}
          </span>
        </div>
        <FiChevronDown
          className={`ml-2 transition-transform duration-200 text-gray-400 group-hover:text-gray-600 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full md:w-64 bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {dropdownOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No roles available</p>
              </div>
            ) : (
              dropdownOptions.map((role) => {
                const isSelected = selectedRole === role.role;
                return (
                  <button
                    key={role.role}
                    disabled={role.role === 'Select Role'}
                    className={`w-full text-left px-4 py-3 transition-all duration-150 flex items-center gap-3 ${isSelected
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-blue-50'
                      } ${role.role === 'Select Role'
                        ? 'text-gray-400 cursor-default opacity-50'
                        : 'cursor-pointer'
                      }`}
                    onClick={() => handleSelect(role.role)}
                  >
                    {isSelected && (
                      <div className="p-1 bg-blue-600 rounded text-white">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{role.role}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleDropdown;
