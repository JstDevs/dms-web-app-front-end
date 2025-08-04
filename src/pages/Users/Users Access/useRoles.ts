// hooks/useRoles.ts
import { useEffect, useState } from 'react';
import { Permission } from './usePermission';
import { getAllUserAccess } from './userAccessService';

type UserAccess = {
  role: string;
  userAccessID: number;
  permissions: Permission[];
};

const useRoles = (initialPermissions: Permission[]) => {
  const [roles, setRoles] = useState<UserAccess[]>([]);
  const [originalRoles, setOriginalRoles] = useState<UserAccess[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const result = await getAllUserAccess();

        const userAccess = result?.data?.userAccess || [];

        const transformed: UserAccess[] = userAccess.map((roleItem: any) => ({
          role: roleItem.Description,
          userAccessID: roleItem.ID,
          permissions: initialPermissions?.map((perm) => {
            const match = roleItem.moduleAccess.find(
              (m: any) => m.ModuleID === perm.id
            );
            const isAdmin =
              roleItem.Description.toLowerCase() === 'administrator' ||
              roleItem.ID === 1;
            return {
              ...perm,
              view: isAdmin ? true : match?.View ?? false,
              add: isAdmin ? true : match?.Add ?? false,
              edit: isAdmin ? true : match?.Edit ?? false,
              delete: isAdmin ? true : match?.Delete ?? false,
              print: isAdmin ? true : match?.Print ?? false,
            };
          }),
        }));

        setRoles(transformed);
        setOriginalRoles(JSON.parse(JSON.stringify(transformed)));
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to load user access roles', err);
      }
    };

    if (initialPermissions.length > 0 && !isInitialized) {
      loadRoles();
    }
  }, [initialPermissions, isInitialized]);

  const addRole = (roleName: string) => {
    if (
      !roleName ||
      roles.some((r) => r.role.toLowerCase() === roleName.toLowerCase())
    ) {
      return false;
    }

    const newRole: UserAccess = {
      role: roleName,
      userAccessID: 0, //
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
    return [...originalRoles]; // Return the original roles array
  };
  const removeRole = (roleName: string) => {
    console.log(roleName, roles);
    setRoles((prev) => prev.filter((role) => role.role !== roleName));
    setOriginalRoles((prev) => prev.filter((role) => role.role !== roleName));
  };
  const saveChanges = () => {
    setOriginalRoles([...roles]);
  };

  const hasChanges = JSON.stringify(roles) !== JSON.stringify(originalRoles);

  return {
    roles,
    originalRoles,
    addRole,
    updatePermission,
    toggleAllPermissions,
    removeRole,
    resetToOriginal,
    saveChanges,
    hasChanges,
    isInitialized,
  };
};

export default useRoles;
