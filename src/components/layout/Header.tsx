import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, UserCircle, ChevronDown, Settings, LogOut, User } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

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

  const handleLogout = async () => {
    await logout();
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
      toast.success(selectedRole?.ID + ' role selected');
      // navigate(`/dashboard`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-300 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] z-10 sticky top-0 backdrop-blur-sm bg-white/95">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Placeholder Left Section */}
        <div className="flex-1" />

        <div className="ml-4 flex items-center gap-3 md:ml-6">
          {/* ✅ Enhanced Role Selector */}

          {user && user?.accessList?.length > 1 && (
            <div className="relative hidden">
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

          {/* Enhanced Profile Dropdown with Premium Design */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileMenuOpen(!isProfileMenuOpen);
                setIsNotificationOpen(false);
              }}
              className={`max-w-xs flex items-center gap-3 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                isProfileMenuOpen
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg'
                  : 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-2 border-transparent hover:border-blue-100 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-lg'
              }`}
            >
              {/* Enhanced Profile Icon with Gradient */}
              <div className="relative">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 opacity-20 blur-sm transition-opacity ${
                  isProfileMenuOpen ? 'opacity-30' : ''
                }`}></div>
                <div className="relative p-2 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full shadow-lg ring-2 ring-white">
                  <UserCircle className="h-6 w-6 text-white" />
                </div>
                {/* Online Status Indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              
              {/* User Info */}
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-semibold text-gray-800 leading-tight">
                  {user?.UserName}
                </span>
                <span className="text-xs text-gray-500 leading-tight">
                  {selectedRole?.Description || 'User'}
                </span>
              </div>
              
              {/* Animated Chevron */}
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-all duration-200 ${
                isProfileMenuOpen ? 'rotate-180 text-blue-600' : ''
              }`} />
            </button>

            {isProfileMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-3 w-64 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] bg-white ring-1 ring-gray-200 z-50 animate-fade-in overflow-hidden">
                {/* Header Section with Gradient */}
                <div className="relative px-5 py-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-white opacity-20 blur-md"></div>
                      <div className="relative p-2.5 bg-white/20 backdrop-blur-sm rounded-full ring-2 ring-white/30">
                        <UserCircle className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-blue-700"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-0.5">Account</p>
                      <p className="text-sm font-bold text-white truncate">{user?.UserName}</p>
                      <p className="text-xs text-blue-200 truncate mt-0.5">{selectedRole?.Description || 'User Role'}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link
                    to="/users/profile"
                    className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-150 group"
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium">Profile</span>
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-150 group"
                    role="menuitem"
                  >
                    <div className="p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                      <LogOut className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="font-medium">Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};



export default Header;
