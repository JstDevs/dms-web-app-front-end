import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, UserCircle } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';

const Header: React.FC = () => {
  const { logout, user, selectedRole, setSelectedRole } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useNotification();
  const navigate = useNavigate();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        profileRef.current &&
        !profileRef.current.contains(target) &&
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false);
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value);
    setSelectedRoleId(selectedId);

    const fullRole = user?.accessList.find((role) => role.ID === selectedId);
    if (fullRole) {
      setSelectedRole(fullRole);
      navigate(`/dashboard`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Placeholder Left Section */}
        <div className="flex-1" />

        <div className="ml-4 flex items-center gap-3 md:ml-6">
          {/* ✅ Role Selector */}
          {user && user?.accessList?.length > 1 && (
            <select
              value={selectedRole?.ID || ''}
              onChange={handleRoleChange}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          )}

          {/* Notification Dropdown */}
          {/* <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                setIsProfileMenuOpen(false);
              }}
              className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
            >
              <Bell className="h-6 w-6" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 rounded-full h-4 w-4 flex items-center justify-center text-xs text-white">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-72 sm:w-80 max-w-[90vw] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-fade-in">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">
                      Notifications
                    </h3>
                  </div>

                  {notifications.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${
                            !n.read ? "bg-blue-50" : ""
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No notifications
                    </div>
                  )}

                  <div className="border-t border-gray-200 px-4 py-2">
                    <button
                      className="text-xs text-blue-600 hover:text-blue-800"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div> */}

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileMenuOpen(!isProfileMenuOpen);
                setIsNotificationOpen(false);
              }}
              className="max-w-xs flex items-center gap-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <UserCircle className="h-8 w-8 text-gray-400" />
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {user?.UserName}
              </span>
            </button>

            {isProfileMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-fade-in">
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
