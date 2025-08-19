import React from 'react';
import { UserCircle, Bell, Lock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const allocationPermissions = useModulePermissions(12); // 1 = MODULE_ID
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Settings</h1>

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
                <button
                  onClick={() => {
                    (allocationPermissions?.Add ||
                      allocationPermissions?.Edit) &&
                      navigate('/settings/change-password');
                  }}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <Lock className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        Change Password
                      </p>
                      <p className="text-xs text-gray-500">
                        Update your password regularly
                      </p>
                    </div>
                  </div>
                </button>

                {/* <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        Notification Preferences
                      </p>
                      <p className="text-xs text-gray-500">
                        Manage your notification settings
                      </p>
                    </div>
                  </div>
                </button> */}

                {/* <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        Security Settings
                      </p>
                      <p className="text-xs text-gray-500">
                        Configure your security preferences
                      </p>
                    </div>
                  </div>
                </button> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
