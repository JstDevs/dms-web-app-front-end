import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Permission = {
  View?: boolean;
  Add?: boolean;
  Edit?: boolean;
  Delete?: boolean;
  Print?: boolean;
};

export function useModulePermissions(moduleId: number): Permission {
  const { selectedRole } = useAuth();

  const perms = useMemo(() => {
    if (!selectedRole || selectedRole.Description === 'Administration') {
      return { View: true, Add: true, Edit: true, Delete: true, Print: true };
    }
    if (!selectedRole.moduleAccess) return {};
    const found = selectedRole.moduleAccess.find(
      (m: any) => m.ModuleID === moduleId
    );
    return found || {};
  }, [selectedRole, moduleId]);

  return perms;
}
