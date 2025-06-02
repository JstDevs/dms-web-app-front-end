import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Clock,
  FileCheck,
  FolderClosed,
  ChevronDown,
  ChevronUp,
  Building,
  BookOpenCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";

const Sidebar: React.FC = () => {
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const toggleSubmenu = (name: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    {
      name: "Departments",
      icon: Building,
      submenu: [
        { name: "Main", path: "/departments/main" },
        { name: "Sub-Department", path: "/departments/sub" },
      ],
    },
    {
      name: "Documents",
      path: "/documents",
      icon: FileText,
      submenu: [
        { name: "Upload", path: "/documents/upload" },
        { name: "Types", path: "/documents/document-types" },
      ],
    },
    // { name: "Documents", icon: FileText, path: "/my-documents" },
    { name: "Pending Approvals", icon: FileCheck, path: "/pending-approvals" },
    { name: "Recent Activity", icon: Clock, path: "/activity" },
    { name: "Department Files", icon: FolderClosed, path: "/department" },
    // { name: "Team", icon: Users, path: "/team" },
    {
      name: "Users Settings",
      icon: Users,
      submenu: [
        { name: "Users", path: "/users/members" },
        { name: "User Access", path: "/users/access" },
      ],
    },
    {
      name: "Digitalization Settings",
      icon: Users,
      submenu: [
        { name: "Allocation", path: "/digitalization/allocation" },
        { name: "Batch Upload", path: "/digitalization/batch-upload" },
      ],
    },

    // {
    //   name: "Locations",
    //   icon: Map,
    //   submenu: [
    //     { name: "Regions", path: "/locations/regions" },
    //     { name: "Municipalities", path: "/locations/municipalities" },
    //     { name: "Barangays", path: "/locations/barangays" },
    //   ],
    // },
    {
      name: "OCR",
      icon: BookOpenCheck,
      submenu: [
        { name: "Unrecorded", path: "/ocr/unrecorded" },
        { name: "Template", path: "/ocr/template" },
        // { name: "Handwritten", path: "/ocr/handwritten" },
      ],
    },
    // {
    //   name: "LGU Maintenance",
    //   path: "/lgu",
    //   icon: SlidersHorizontal,
    // },
    { name: "Settings", icon: Settings, path: "/settings" },
  ];

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsMobileOpen(false);
      }
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  return (
    <>
      {/* Mobile Hamburger Button - Only shows on mobile when sidebar is closed */}
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
          "bg-blue-900 text-white flex flex-col transition-all duration-300 ease-in-out",
          "fixed md:relative z-30 h-screen",
          "left-0 top-0",
          "w-64",
          isMobile ? "translate-x-[-100%] md:translate-x-0" : "",
          isMobileOpen && "translate-x-0"
        )}
        style={{
          transition: "transform 0.3s ease-in-out, width 0.3s ease-in-out",
        }}
      >
        {/* Mobile Close Button - Only shows on mobile */}
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
            {navItems.map((item) => (
              <li key={item.name}>
                {item.submenu ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.name)}
                      className={cn(
                        "flex items-center w-full px-2 py-2 rounded-md transition-colors text-left",
                        "text-blue-300 hover:text-white hover:bg-blue-800"
                      )}
                    >
                      <item.icon
                        className={cn("flex-shrink-0", "h-5 w-5 mr-3")}
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
                          <li key={sub.name}>
                            <NavLink
                              to={sub.path}
                              className={({ isActive }) =>
                                cn(
                                  "block px-2 py-1 rounded-md text-sm",
                                  isActive
                                    ? "bg-blue-800 text-white"
                                    : "text-blue-300 hover:text-white hover:bg-blue-800"
                                )
                              }
                              onClick={() => isMobile && setIsMobileOpen(false)}
                            >
                              {sub.name}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-2 py-2 rounded-md transition-colors",
                        isActive
                          ? "bg-blue-800 text-white"
                          : "text-blue-300 hover:text-white hover:bg-blue-800"
                      )
                    }
                    onClick={() => isMobile && setIsMobileOpen(false)}
                  >
                    <item.icon
                      className={cn("flex-shrink-0", "h-5 w-5 mr-3")}
                    />

                    <span>{item.name}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="text-xs text-blue-300">
            <p>DMS v1.0</p>
            <p>© 2025 Company</p>
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

export default Sidebar;
