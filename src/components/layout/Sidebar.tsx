import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Grid3x3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '../../utils/cn';
//

// Define proper types for nav items
interface NavSubmenu {
  name: string;
  path: string;
  moduleId?: number;
  icon?: any;
  submenu?: NavSubmenu[];
}

interface NavItem {
  name: string;
  icon: any;
  path?: string;
  moduleId?: number;
  submenu?: NavSubmenu[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  {
    name: 'Documents',
    icon: FileText,
    path: '/documents',
    submenu: [
      { name: 'Library', path: '/documents/library', moduleId: 4 },
      {
        name: 'Upload',
        icon: FileText,
        path: '/documents/upload',
        submenu: [
          { name: 'Manual Upload', path: '/documents/upload', moduleId: 3 },
          { name: 'Batch Upload', path: '/digitalization/batch-upload', moduleId: 8 },
        ]
      },
      {
        name: 'OCR',
        icon: FileText,
        path: '/documents/ocr',
        submenu: [
          { name: 'OCR Upload', path: '/xxx', moduleId: 9 },
          { name: 'Unrecorded', path: '/ocr/unrecorded', moduleId: 9 },
        ]
      },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    path: '/documents',
    submenu: [
      { name: 'Department', path: '/departments/main', moduleId: 1 },
      {
        name: 'Document Settings',
        icon: FileText,
        path: '/documents/upload',
        submenu: [
          { name: 'Document Type', path: '/departments/sub', moduleId: 2 },
          { name: 'Fields', path: '/ocr/fields', moduleId: 11 },
          { name: 'Allocation', path: '/digitalization/allocation', moduleId: 7 },
          // { name: 'Masking Template', path: '/ocr/template', moduleId: 10 },
        ]
      },
      {
        name: 'Template Settings',
        icon: FileText,
        path: '/ocr/template',
        submenu: [
          { name: 'OCR Template', path: '/ocr/template', moduleId: 10 },
          { name: 'Masking Template', path: '/ocr/template', moduleId: 10 },
        ]
      },
      {
        name: 'Collaboration Settings',
        icon: FileText,
        path: '/documents/upload',
        submenu: [
          // { name: 'Collaboration Access', path: '/yyy', moduleId: 9 },
          { name: 'Approval Matrix', icon: Grid3x3, path: '/approval-matrix', moduleId: 9 },
          { name: 'Masking Setup', path: '/ocr/unrecorded', moduleId: 9 },
        ]
      },
      {
        name: 'User Settings',
        icon: FileText,
        path: '/documents/upload',
        submenu: [
          { name: 'Profile', path: '/settings', moduleId: 12 },
          { name: 'Users', path: '/users/members', moduleId: 5 },
          { name: 'User Access', path: '/users/access', moduleId: 6 },
          { name: 'Audit Trail', path: '/audit-trail', moduleId: 1 },
        ]
      },
    ],
  },  
];

const Sidebar: React.FC = () => {
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { selectedRole } = useAuth();

  const isAdmin = selectedRole?.Description === 'Administration';
  
  // Permission check is *only* via selectedRole.moduleAccess now!
  function hasViewPermission(moduleId?: number) {
    // if (moduleId !== undefined) {
    //   toast.success(`Checking permission for moduleId: ${moduleId}`);
    // }

    if (isAdmin) return true;
    if (!moduleId) return true; // Public
    if (!selectedRole?.moduleAccess) return false;
    const mod = selectedRole.moduleAccess.find(
      (m: any) => m.ModuleID === moduleId
    );
    if (mod?.View) return true;
    return false;
  }

  // Filter navItems according to selectedRole only.
  function deepFilterNavItems<T extends NavItem | NavSubmenu>(
    items: T[],
    hasViewPermission: (moduleId?: number) => boolean
  ): T[] {
    return items
      .map((item) => {
        if (item.submenu && item.submenu.length > 0) {
          const filteredSubmenu = deepFilterNavItems(item.submenu as T[], hasViewPermission);

          if (filteredSubmenu.length > 0) {
            return {
              ...item,
              submenu: filteredSubmenu,
            };
          }

          return null; // No visible children — hide this container
        }

        // Leaf node: return only if it has permission
        return hasViewPermission(item.moduleId) ? item : null;
      })
      .filter(Boolean) as T[];
  }

  const filteredNavItems = React.useMemo(() => {
    return deepFilterNavItems(navItems, hasViewPermission) as NavItem[];
  }, [selectedRole]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsMobileOpen(false);
      }
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      {isMobile && !isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-40 p-1 rounded-md bg-blue-900 hover:opacity-80 text-white md:hidden"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'bg-blue-900 text-white flex flex-col transition-all duration-300 ease-in-out',
          'fixed md:relative z-30 h-screen',
          'left-0 top-0',
          'w-64',
          isMobile ? 'translate-x-[-100%] md:translate-x-0' : '',
          isMobileOpen && 'translate-x-0'
        )}
        style={{
          transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out',
        }}
      >
        {/* Mobile Close Button */}
        {isMobile && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute right-2 top-2 p-1 rounded-md text-blue-300 hover:text-white hover:bg-blue-800 md:hidden"
          >
            <X size={20} />
          </button>
        )}

        <div className="flex items-center justify-center h-[58px] px-4 border-b border-blue-800">
          <h1 className="text-xl font-semibold text-white text-center">DMS</h1>
        </div>

        <nav className="flex-1 pt-4 pb-4 overflow-y-auto sidebar-custom-scrollbar">
          <ul className="space-y-1 px-2">
            {filteredNavItems.map((item) => (
              <li key={item?.name}>
                {item?.submenu ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.name)}
                      className={cn(
                        'flex items-center w-full px-2 py-2 rounded-md transition-colors text-left',
                        'text-blue-300 hover:text-white hover:bg-blue-800'
                      )}
                    >
                      <item.icon
                        className={cn('flex-shrink-0', 'h-5 w-5 mr-3')}
                      />
                      <span className="flex-1">{item.name}</span>
                      {openSubmenus[item.name] ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {openSubmenus[item.name] && (
                      <ul className="ml-8 space-y-1 mt-1">
                        {item.submenu.map((sub) => (
                          <SubMenuItem
                            key={sub.name}
                            item={sub}
                            level={1}
                            isMobile={isMobile}
                            setIsMobileOpen={setIsMobileOpen}
                          />
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item?.path || ''}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center px-2 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-blue-800 text-orange'
                          : 'text-blue-300 hover:text-white hover:bg-blue-800'
                      )
                    }
                    onClick={() => isMobile && setIsMobileOpen(false)}
                  >
                    {item?.icon && (
                      <item.icon
                        className={cn('flex-shrink-0', 'h-5 w-5 mr-3')}
                      />
                    )}
                    <span>{item?.name}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="text-xs text-blue-300">
            <p>DMS v1.0.0</p>
            <p>© 2025 BLS</p>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};

const SubMenuItem = ({
  item,
  level = 1,
  isMobile,
  setIsMobileOpen,
}: {
  item: NavSubmenu;
  level?: number;
  isMobile: boolean;
  setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <li>
      {item.submenu ? (
        <>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              'flex items-center justify-start w-full px-2 py-1 rounded-md text-sm transition-colors',
              'text-left text-blue-300 hover:text-white hover:bg-blue-800'
            )}
          >
            <span className="flex-1 text-left">{item.name}</span>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {open && (
            <ul className={cn(`ml-${level * 4} space-y-1 mt-1`)}>
              {item.submenu.map((child) => (
                <SubMenuItem
                  key={child.name}
                  item={child}
                  level={level + 1}
                  isMobile={isMobile}
                  setIsMobileOpen={setIsMobileOpen}
                />
              ))}
            </ul>
          )}
        </>
      ) : (
        <NavLink
          to={item.path}
          className={({ isActive }) =>
            cn(
              'block w-full text-left px-2 py-1 rounded-md text-sm',
              isActive
                ? 'bg-blue-800 text-white'
                : 'text-blue-300 hover:text-white hover:bg-blue-800'
            )
          }
          onClick={() => isMobile && setIsMobileOpen(false)}
        >
          {item.name}
        </NavLink>
      )}
    </li>
  );
};

export default Sidebar;