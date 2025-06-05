// hooks/useRoles.ts
import { useEffect, useState } from "react";
import { Permission } from "./usePermission";

type UserAccess = {
  role: string;
  permissions: Permission[];
};

const useRoles = (initialPermissions: Permission[]) => {
  const [roles, setRoles] = useState<UserAccess[]>(() => {
    const defaultRoles = [
      {
        role: "Administrator",
        permissions: initialPermissions.map((p) => ({
          ...p,
          view: true,
          add: true,
          edit: true,
          delete: true,
          print: true,
        })),
      },
      {
        role: "Manager",
        permissions: initialPermissions.map((p) => ({
          ...p,
          view: true,
          add: true,
        })),
      },
      {
        role: "User",
        permissions: initialPermissions.map((p) => ({
          ...p,
          view: true,
        })),
      },
    ];
    return defaultRoles;
  });

  const [originalRoles, setOriginalRoles] = useState<UserAccess[]>([]);

  useEffect(() => {
    setOriginalRoles([...roles]);
  }, [initialPermissions]);

  const addRole = (roleName: string) => {
    if (
      !roleName ||
      roles.some((r) => r.role.toLowerCase() === roleName.toLowerCase())
    ) {
      return false;
    }

    const newRole: UserAccess = {
      role: roleName,
      permissions: initialPermissions.map((p) => ({
        ...p,
        view: false,
        add: false,
        edit: false,
        delete: false,
        print: false,
      })),
    };

    setRoles((prev) => [...prev, newRole]);
    return true;
  };

  const updatePermission = (
    roleName: string,
    permissionId: number,
    field: keyof Permission
  ) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.role === roleName
          ? {
              ...role,
              permissions: role.permissions.map((perm) =>
                perm.id === permissionId
                  ? { ...perm, [field]: !perm[field] }
                  : perm
              ),
            }
          : role
      )
    );
  };

  const toggleAllPermissions = (roleName: string, field: keyof Permission) => {
    setRoles((prev) => {
      const role = prev.find((r) => r.role === roleName);
      if (!role) return prev;

      const allChecked = role.permissions.every((perm) => perm[field]);

      return prev.map((r) =>
        r.role === roleName
          ? {
              ...r,
              permissions: r.permissions.map((p) => ({
                ...p,
                [field]: !allChecked,
              })),
            }
          : r
      );
    });
  };

  const resetToOriginal = () => {
    setRoles([...originalRoles]);
  };

  const saveChanges = () => {
    setOriginalRoles([...roles]);
  };

  const hasChanges = JSON.stringify(roles) !== JSON.stringify(originalRoles);

  return {
    roles,
    addRole,
    updatePermission,
    toggleAllPermissions,
    resetToOriginal,
    saveChanges,
    hasChanges,
  };
};

export default useRoles;
