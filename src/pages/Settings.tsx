import React, {useState} from 'react';
import { UserCircle, Bell, Lock, Shield, User, ChevronDown, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { logout, user, selectedRole, setSelectedRole } = useAuth();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const navigate = useNavigate();
  const allocationPermissions = useModulePermissions(12); // 1 = MODULE_ID

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value);
    setSelectedRoleId(selectedId);

    const fullRole = user?.accessList.find((role) => role.ID === selectedId);
    if (fullRole) {
      setSelectedRole(fullRole);
    }
  };
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Profile</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mr-4">
              <UserCircle className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-gray-900">
                {user?.UserName}
              </h2>
              {/* <p className="text-sm text-gray-500">{user?.UserAccessID}</p> */}
              <div className="flex gap-2 ">
                {user?.accessList?.map((accessLevel) => (
                  <span
                    key={accessLevel.ID}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2"
                  >
                    {' '}
                    {accessLevel.Description}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Account Settings
              </h3>
              <div className="space-y-4">

                {/* Change Role Button */}
                <button
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 w-80">
                        Switch Roles
                      </p>
                      <p className="text-xs text-gray-500">
                        Activate another role for your account
                      </p>
                    </div>
                  </div>                  
                  <div className="flex items-center relative">
                    <select
                      value={selectedRole?.ID || ''}
                      onChange={handleRoleChange}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 text-gray-700 bg-white hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.1)] appearance-none cursor-pointer"
                    >
                      <option value="" hidden>
                        Select Role
                      </option>
                      {user.accessList.map((role) => (
                        <option key={role.ID} value={role.ID}>
                          {role.Description}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </button>

                {/* Change Password Button */}
                <button
                  onClick={() => {
                    (allocationPermissions?.Add ||
                      allocationPermissions?.Edit) &&
                      navigate('/users/change-password');
                  }}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <Lock className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 w-80">
                        Change Password
                      </p>
                      <p className="text-xs text-gray-500">
                        Update your password regularly
                      </p>
                    </div>
                  </div>
                </button>

                {/* Test Button */}
                {/* <button
                  onClick={() => {
                    toast.success('This is a test notification!');
                  }}
                >
                  Test Notification
                </button> */}

                {/* Sign Out button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 bg-red-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <LogOut className="h-5 w-5 text-red-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-red-600">
                        Sign Out
                      </p>
                    </div>
                  </div>
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
