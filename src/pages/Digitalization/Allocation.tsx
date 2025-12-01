import { PlusCircle, Trash2, Pencil, Save, X, Settings, Users, UserCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FieldSettingsPanel } from '../FieldSetting';
import { Button } from '@chakra-ui/react';
// import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import toast from 'react-hot-toast';
import { fetchFieldsByLink, Field, updateFieldsByLink, fetchRoleAllocations, fetchRoleAllocationsByLink, addRoleAllocation, updateRoleAllocation, deleteRoleAllocation, fetchUsersByRole, RoleDocumentAccess } from './utils/allocationServices';
import { fetchAvailableFields } from '../Document/utils/fieldAllocationService';
import { fetchOCRFields } from '../OCR/Fields/ocrFieldService';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { MODULE_IDS } from '@/constants/moduleIds';
import { getAllUserAccess } from '@/pages/Users/Users Access/userAccessService';
import { DeleteDialog } from '@/components/ui/DeleteDialog';
type PermissionKey =
  | 'view'
  | 'add'
  | 'edit'
  | 'delete'
  | 'print'
  | 'confidential'
  | 'comment'
  | 'collaborate'
  | 'finalize'
  | 'masking';

type RolePermission = {
  roleName: string;
  roleID: number; // UserAccessID
  isEditing?: boolean;
  allocationId?: number; // Store the allocation ID if it exists
  affectedUsersCount?: number;
  affectedUsers?: Array<{ ID: number; UserName: string }>;
} & Record<PermissionKey, boolean>;
type updatedFields = {
  ID: number;
  Field: string;
  Type: string;
  Description: string;
}[];

type FieldInfo = {
  ID: number;
  FieldID?: number; // Link to OCRavailableFields.ID (master field)
  FieldNumber?: number; // FieldNumber for saving (1-10)
  Field: string;
  Type?: string;
  updatedAt: string;
  createdAt: string;
  IsActive?: boolean;
};
export const AllocationPanel = () => {
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSubDept, setSelectedSubDept] = useState('');
  const [roleAllocations, setRoleAllocations] = useState<RolePermission[]>([]);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleID, setNewRoleID] = useState<number | ''>('');
  const [availableRoles, setAvailableRoles] = useState<Array<{ ID: number; Description: string }>>([]);
  const [expandedRoles, setExpandedRoles] = useState<Record<number, boolean>>({});
  const [savedFieldsData, setSavedFieldsData] = useState<updatedFields>([]);
  const [activeTab, setActiveTab] = useState<'fields' | 'roles'>('fields');

  // const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const {
    departmentOptions,
    getSubDepartmentOptions,
    loading: loadingDepartments,
  } = useNestedDepartmentOptions();
  const fieldPanelRef = useRef<any>(null);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsInfo, setFieldsInfo] = useState<FieldInfo[]>([]);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [hasFetchedFields, setHasFetchedFields] = useState(false);
  const [masterFieldsList, setMasterFieldsList] = useState<any[]>([]);

  const [subDepartmentOptions, setSubDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const allocationPermissions = useModulePermissions(MODULE_IDS.allocation);
  const canAdd = Boolean(allocationPermissions?.Add);
  const canEdit = Boolean(allocationPermissions?.Edit);
  const canDelete = Boolean(allocationPermissions?.Delete);

  const ensureAddPermission = () => {
    if (canAdd) return true;
    toast.error('You do not have permission to add allocations.');
    return false;
  };

  const ensureEditPermission = () => {
    if (canEdit) return true;
    toast.error('You do not have permission to edit allocations.');
    return false;
  };

  const ensureDeletePermission = () => {
    if (canDelete) return true;
    toast.error('You do not have permission to delete allocations.');
    return false;
  };
  // Update document types when department selection changes
  // useEffect(() => {
  //   if (selectedDept) {
  //     const selectedDeptId = departmentOptions.find(
  //       (dept) => dept.label === selectedDept
  //     )?.value;

  //     if (selectedDeptId) {
  //       const subs = getSubDepartmentOptions(Number(selectedDeptId));
  //       setSubDepartmentOptions(subs);
  //       setSelectedSubDept(''); // Reset document type when department changes
  //     }
  //   } else {
  //     setSubDepartmentOptions([]);
  //     setSelectedSubDept('');
  //   }
  // }, [selectedDept, departmentOptions, getSubDepartmentOptions]);
  useEffect(() => {
    if (selectedDept && departmentOptions.length > 0) {
      // const selectedDeptId = departmentOptions.find(
      //   (dept) => dept.label === selectedDept
      // )?.value;

      if (selectedDept) {
        const subs = getSubDepartmentOptions(Number(selectedDept));
        setSubDepartmentOptions(subs);
        // Only reset if the current subDept doesn't exist in new options
        if (!subs.some((sub) => sub.value === selectedSubDept)) {
          setSelectedSubDept('');
        }
      }
    } else {
      setSubDepartmentOptions([]);
      if (selectedSubDept) {
        // Only reset if there's a value
        setSelectedSubDept('');
      }
    }
  }, [selectedDept, departmentOptions]);

  // Fetch fields when Document Type is selected
  useEffect(() => {
    const fetchFields = async () => {
      if (!selectedSubDept) {
        setFieldsInfo([]);
        setHasFetchedFields(false);
        return;
      }

      setFieldsLoading(true);
      setFieldsError(null);
      try {
        // Load both: available universe + current configuration + ALL master fields
        const [availableFromBackend, current, masterFields] = await Promise.all([
          fetchAvailableFields(Number(selectedDept), Number(selectedSubDept)),
          fetchFieldsByLink(Number(selectedSubDept)),
          fetchOCRFields().catch(() => []), // Fetch all master fields, fallback to empty if fails
        ]);
        
        // Store master fields for dropdown
        setMasterFieldsList(masterFields || []);
        
        // Map all master fields to available fields format
        const allMasterFields = (masterFields || []).map((mf: any) => ({
          ID: mf.ID,
          FieldID: mf.ID, // FieldID is the same as ID for master fields
          Field: mf.Field,
          MasterField: mf.Field,
          Description: mf.Field,
          Type: 'text', // Default type
          DepartmentId: Number(selectedDept),
          SubDepartmentId: Number(selectedSubDept),
          UserId: 0,
          View: true,
          Add: false,
          Edit: true,
          Delete: false,
          Print: false,
          Confidential: false,
          IsActive: false,
          FieldNumber: 0, // Will be assigned when linked
        })) as any;
        
        // Merge: Use backend available fields if they exist (may have additional metadata),
        // otherwise use master fields. Create a map to avoid duplicates.
        const availableMap = new Map<number, any>();
        
        // First, add all master fields (complete list)
        allMasterFields.forEach((mf: any) => {
          availableMap.set(mf.ID, mf);
        });
        
        // Then, override with backend available fields if they have additional info
        (availableFromBackend || []).forEach((af: any) => {
          const fieldID = af.FieldID ?? af.ID;
          if (availableMap.has(fieldID)) {
            // Merge backend data with master field data
            availableMap.set(fieldID, {
              ...availableMap.get(fieldID),
              ...af,
              FieldID: fieldID, // Ensure FieldID is set
            });
          } else {
            // Backend field not in master - add it anyway
            availableMap.set(fieldID, {
              ...af,
              FieldID: fieldID,
            });
          }
        });
        
        // Convert map back to array
        const available = Array.from(availableMap.values());

        // Build map from current by-link - key by FieldID to match master fields
        const currentMapByFieldID = new Map<number, Field>(
          (current || []).map((c: Field) => [Number(c.FieldID || 0), c])
        );
        // Also build map by FieldNumber for fallback
        const currentMapByFieldNumber = new Map<number, Field>(
          (current || []).map((c: Field) => [Number(c.FieldNumber), c])
        );

        // Start with available list (all master fields)
        const baseList: FieldInfo[] = (available || []).map((f: any) => {
          const fieldID = f.FieldID ?? f.ID; // Get FieldID from available fields (link to master)
          // Match by FieldID first (preferred), then by FieldNumber as fallback
          // Also try matching by FieldNumber from available field if FieldID match fails
          const currentMatch = currentMapByFieldID.get(fieldID) || 
                             currentMapByFieldNumber.get(Number((f.FieldNumber || f.ID) ?? 0)) ||
                             (f.FieldNumber ? currentMapByFieldNumber.get(Number(f.FieldNumber)) : null);
          const activeVal = currentMatch ? (currentMatch as any).Active : (f as any)?.Active;
          const masterFieldName = f.Field ?? f.MasterField ?? ''; // Master field name
          const currentDescription = currentMatch?.Description ?? '';
          
          // Display logic: If FieldID exists and Description matches master, use master (for cascade updates)
          // Otherwise, use Description (for custom names)
          const displayField = fieldID && currentDescription === masterFieldName
            ? masterFieldName // Use master (will update when master changes)
            : (currentDescription || masterFieldName || f.Description || '');
          
          // Use FieldNumber from current match if exists, otherwise use a placeholder
          const fieldNumber = currentMatch ? Number(currentMatch.FieldNumber) : (f.FieldNumber || 0);
          
          // Create unique ID: Use FieldNumber if linked, otherwise use FieldID + a large offset to avoid conflicts
          // This ensures each field has a unique ID even if FieldNumber is 0
          const uniqueID = fieldNumber > 0 ? fieldNumber : (fieldID + 10000); // Offset to avoid conflicts with FieldNumbers 1-10
          
          // Prioritize DataType from currentMatch (DB), then from available field, then default to 'text'
          // Convert DataType to lowercase for consistency ('Date' -> 'date', 'Text' -> 'text')
          const dataType = currentMatch?.DataType 
            ? String(currentMatch.DataType).toLowerCase()
            : (f.DataType 
              ? String(f.DataType).toLowerCase()
              : (f.Type 
                ? String(f.Type).toLowerCase()
                : 'text'));
          
          return {
            ID: uniqueID, // Unique ID for React key
            FieldID: fieldID, // Track FieldID to link to master
            FieldNumber: fieldNumber, // Store FieldNumber separately for saving
            Field: displayField,
            Type: dataType, // Use properly prioritized DataType
            updatedAt: '',
            createdAt: '',
            IsActive:
              activeVal === 1 || activeVal === '1' || activeVal === true || activeVal === 'true',
          } as FieldInfo;
        });

        // Include any current rows that aren't in available (union) - fields without FieldID
        // Create a set of all FieldIDs and FieldNumbers from baseList to prevent duplicates
        const baseFieldIDs = new Set(baseList.map(b => b.FieldID).filter(id => id && id > 0));
        const baseFieldNumbers = new Set(baseList.map(b => b.FieldNumber).filter(num => num && num > 0));
        const baseIDs = new Set(baseList.map(b => b.ID));
        
        const union: FieldInfo[] = [
          ...baseList,
          ...(current || [])
            .filter((c: Field) => {
              const fieldID = c.FieldID || 0;
              const fieldNumber = Number(c.FieldNumber);
              // Only include if:
              // 1. FieldID is 0 (unlinked) AND FieldNumber not in baseList, OR
              // 2. FieldID exists but not in baseList (shouldn't happen, but safety check)
              return (fieldID === 0 && !baseFieldNumbers.has(fieldNumber) && !baseIDs.has(fieldNumber)) ||
                     (fieldID > 0 && !baseFieldIDs.has(fieldID));
            })
            .map((c: Field) => {
              const fieldNumber = Number(c.FieldNumber);
              return {
                ID: fieldNumber, // Use FieldNumber as ID for linked fields
                FieldID: c.FieldID || 0, // Preserve FieldID from current fields
                FieldNumber: fieldNumber, // Store FieldNumber
                Field: c.Description,
                Type: String(c.DataType || 'text').toLowerCase(),
                updatedAt: '',
                createdAt: '',
                IsActive:
                  (c as any).Active === 1 ||
                  (c as any).Active === '1' ||
                  (c as any).Active === true ||
                  (c as any).Active === 'true',
              } as FieldInfo;
            }),
        ];
        
        // Final deduplication by ID to ensure no duplicates
        const uniqueUnion = Array.from(
          new Map(union.map(f => [f.ID, f])).values()
        );

        setFieldsInfo(uniqueUnion);
        setHasFetchedFields(true);
      } catch (error) {
        console.error('Failed to fetch fields:', error);
        setFieldsError('Failed to load fields');
        setFieldsInfo([]);
        setHasFetchedFields(true);
      } finally {
        setFieldsLoading(false);
      }
    };

    fetchFields();
  }, [selectedSubDept]);

  // Helper function to convert any value to boolean
  const toBool = (val: any): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') return val === '1' || val === 'true' || val === 'True';
    return false;
  };

  // Helper function to refresh role allocations (reusable)
  const refreshRoleAllocations = async () => {
    if (!selectedSubDept || !selectedDept) {
      setRoleAllocations([]);
      return;
    }

    try {
      console.log('🔄 Refreshing role allocations for:', {
        selectedDept,
        selectedSubDept,
      });

      // Fetch role allocations by department and subdepartment
      let roleAllocs = await fetchRoleAllocations(selectedDept, selectedSubDept);
      console.log('📥 Role allocations from fetchRoleAllocations:', roleAllocs);
      
      // If empty, try by LinkID as fallback
      if (!roleAllocs || roleAllocs.length === 0) {
        console.log('⚠️ No role allocations found, trying by LinkID...');
        roleAllocs = await fetchRoleAllocationsByLink(selectedSubDept);
        console.log('📥 Role allocations from fetchRoleAllocationsByLink:', roleAllocs);
      }

      if (!roleAllocs || roleAllocs.length === 0) {
        console.log('ℹ️ No role allocations found in database');
        setRoleAllocations([]);
        setSavedFieldsData([]);
        return;
      }

      // Map RoleDocumentAccess to RolePermission format and fetch affected users
      const mappedRoles: RolePermission[] = await Promise.all(
        roleAllocs.map(async (alloc: RoleDocumentAccess) => {
          // Fetch affected users for this role
          const affectedUsersList = await fetchUsersByRole(alloc.UserAccessID);
          
          // Backend may return ID (uppercase) or id (lowercase) - check both
          const allocationId = alloc.id || (alloc as any).ID || (alloc as any).Id;
          
          console.log('🔍 Mapping role allocation:', {
            roleID: alloc.UserAccessID,
            roleName: alloc.userAccess?.Description,
            allocationId,
            rawAlloc: alloc,
          });
          
          const mappedRole = {
            roleName: alloc.userAccess?.Description || `Role ${alloc.UserAccessID}`,
            roleID: alloc.UserAccessID,
            allocationId: allocationId,
            view: toBool(alloc.View),
            add: toBool(alloc.Add),
            edit: toBool(alloc.Edit),
            delete: toBool(alloc.Delete),
            print: toBool(alloc.Print),
            confidential: toBool(alloc.Confidential),
            comment: toBool(alloc.Comment),
            collaborate: toBool(alloc.Collaborate),
            finalize: toBool(alloc.Finalize),
            masking: toBool(alloc.Masking),
            isEditing: false,
            affectedUsersCount: affectedUsersList.length,
            affectedUsers: affectedUsersList,
          };

          console.log('✅ Mapped role:', {
            roleID: mappedRole.roleID,
            roleName: mappedRole.roleName,
            allocationId: mappedRole.allocationId,
            permissions: {
              view: mappedRole.view,
              add: mappedRole.add,
              edit: mappedRole.edit,
            },
          });

          return mappedRole;
        })
      );

      console.log('✅ Total mapped roles:', mappedRoles.length);
      setRoleAllocations(mappedRoles);
      
      // Set savedFieldsData from the first allocation's fields (they should be the same)
      if (roleAllocs[0]?.fields && Array.isArray(roleAllocs[0].fields) && roleAllocs[0].fields.length > 0) {
        setSavedFieldsData(roleAllocs[0].fields.map((f: any) => ({
          ID: f.ID,
          Field: f.Field || f.Description || '',
          Type: f.Type || 'text',
          Description: f.Description || f.Field || '',
        })));
      } else {
        setSavedFieldsData([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch role allocations:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        selectedDept,
        selectedSubDept,
      });
      setRoleAllocations([]);
      setSavedFieldsData([]);
    }
  };

  // Fetch existing role allocations when Document Type is selected
  useEffect(() => {
    refreshRoleAllocations();
  }, [selectedSubDept, selectedDept]);

  // Load available roles for dropdown
  useEffect(() => {
    const loadAvailableRoles = async () => {
      try {
        const result = await getAllUserAccess();
        const roles = result?.data?.userAccess || [];
        setAvailableRoles(roles.map((role: any) => ({
          ID: role.ID,
          Description: role.Description,
        })));
      } catch (error) {
        console.error('Failed to load available roles:', error);
      }
    };

    loadAvailableRoles();
  }, []);

  const toggleRolePermission = (roleID: number, field: PermissionKey) => {
    const targetRole = roleAllocations.find((role) => role.roleID === roleID);
    if (!targetRole || !targetRole.isEditing) return;

    if (targetRole.allocationId) {
      if (!ensureEditPermission()) return;
    } else if (!ensureAddPermission()) {
      return;
    }

    setRoleAllocations((prev) =>
      prev.map((role) =>
        role.roleID === roleID ? { ...role, [field]: !role[field] } : role
      )
    );
  };

  const toggleRoleEditMode = (roleID: number) => {
    const targetRole = roleAllocations.find((role) => role.roleID === roleID);
    if (!targetRole) return;

    const willEnable = !targetRole.isEditing;
    if (willEnable) {
      if (targetRole.allocationId) {
        if (!ensureEditPermission()) return;
      } else if (!ensureAddPermission()) {
        return;
      }
    }

    setRoleAllocations((prev) =>
      prev.map((role) =>
        role.roleID === roleID
          ? { ...role, isEditing: !role.isEditing }
          : { ...role, isEditing: false }
      )
    );
  };

  const saveRoleAllocation = async (roleID: number) => {
    if (!selectedDept || !selectedSubDept) {
      toast.error('Please select Department and Document Type first.');
      return;
    }

    const role = roleAllocations.find((r) => r.roleID === roleID);
    if (!role) {
      toast.error('Role not found');
      return;
    }

    const isNewRole = !role.allocationId;
    if (isNewRole) {
      if (!ensureAddPermission()) return;
    } else if (!ensureEditPermission()) {
      return;
    }

    const payload = {
      linkid: Number(selectedSubDept),
      useraccessid: roleID,
      View: role.view ? 1 : 0,
      Add: role.add ? 1 : 0,
      Edit: role.edit ? 1 : 0,
      Delete: role.delete ? 1 : 0,
      Print: role.print ? 1 : 0,
      Confidential: role.confidential ? 1 : 0,
      Comment: role.comment ? 1 : 0,
      Collaborate: role.collaborate ? 1 : 0,
      Finalize: role.finalize ? 1 : 0,
      Masking: role.masking ? 1 : 0,
      fields: savedFieldsData.map((field) => ({
        ID: Number(field.ID),
        Field: field.Field,
        Type: field.Type,
        Description: field.Description || '',
      })),
    };

    try {
      console.log('💾 Saving role allocation:', {
        roleID,
        roleName: role.roleName,
        isNewRole,
        payload,
      });

      let response;
      if (role.allocationId) {
        response = await updateRoleAllocation(payload);
        console.log('✅ Update role allocation response:', response);
      } else {
        // If creating, need full payload with depid and subdepid
        response = await addRoleAllocation({
          depid: Number(selectedDept),
          subdepid: Number(selectedSubDept),
          useraccessid: roleID,
          linkid: Number(selectedSubDept),
          View: payload.View,
          Add: payload.Add,
          Edit: payload.Edit,
          Delete: payload.Delete,
          Print: payload.Print,
          Confidential: payload.Confidential,
          Comment: payload.Comment,
          Collaborate: payload.Collaborate,
          Finalize: payload.Finalize,
          Masking: payload.Masking,
          fields: payload.fields,
        });
        console.log('✅ Add role allocation response:', response);
      }

      // Turn off editing mode immediately to provide immediate feedback
      setRoleAllocations((prev) =>
        prev.map((r) =>
          r.roleID === roleID ? { ...r, isEditing: false } : r
        )
      );

      // Small delay to ensure DB commit before refresh (helps with eventual consistency)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reload role allocations to reflect saved changes from DB
      console.log('🔄 Refreshing role allocations after save...');
      await refreshRoleAllocations();
      console.log('✅ Role allocations refreshed');

      toast.success(`Permissions saved for ${role.roleName}`);
    } catch (error: any) {
      console.error('❌ Save role failed:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      
      // Keep editing mode on if save failed so user can retry
      toast.error(
        `Failed to save: ${error?.response?.data?.error || error?.message || 'Please try again.'}`
      );
    }
  };

  const handleAddRoleAllocation = async () => {
    if (!ensureAddPermission()) return;
    if (!selectedDept || !selectedSubDept || !newRoleID) {
      toast.error('Please select Department, Document Type, and a role.');
      return;
    }

    // Check if role already allocated
    if (roleAllocations.some((r) => r.roleID === Number(newRoleID))) {
      toast.error('Role already allocated');
      return;
    }

    const selectedRole = availableRoles.find((r) => r.ID === Number(newRoleID));
    if (!selectedRole) {
      toast.error('Role not found');
      return;
    }

    try {
      // Create role allocation with default permissions (View only)
      const payload = {
        depid: Number(selectedDept),
        subdepid: Number(selectedSubDept),
        useraccessid: Number(newRoleID),
        linkid: Number(selectedSubDept),
        View: 1,
        Add: 0,
        Edit: 0,
        Delete: 0,
        Print: 0,
        Confidential: 0,
        Comment: 0,
        Collaborate: 0,
        Finalize: 0,
        Masking: 0,
        fields: savedFieldsData.map((field) => ({
          ID: Number(field.ID),
          Field: field.Field,
          Type: field.Type,
          Description: field.Description || '',
        })),
      };

      await addRoleAllocation(payload);
      
      // Refresh role allocations using the same logic as initial load (includes fallback)
      await refreshRoleAllocations();
      
      toast.success('Role allocated successfully');
      setNewRoleID('');
      setShowAddRoleModal(false);
    } catch (error: any) {
      console.error('Failed to add role allocation:', error);
      toast.error(error?.response?.data?.error || 'Failed to add role allocation');
    }
  };

  const removeRoleAllocation = async (roleID: number) => {
    const role = roleAllocations.find((r) => r.roleID === roleID);
    if (!role) return;

    if (role.allocationId) {
      if (!ensureDeletePermission()) return;

      try {
        console.log('🗑️ Deleting role allocation:', {
          roleID,
          roleName: role.roleName,
          allocationId: role.allocationId,
          linkId: selectedSubDept,
        });
        
        await deleteRoleAllocation(Number(selectedSubDept), roleID);
        
        // Refresh role allocations
        await refreshRoleAllocations();
        
        toast.success(`Role allocation for "${role.roleName}" has been deleted successfully`);
      } catch (error: any) {
        console.error('❌ Failed to remove role allocation:', error);
        toast.error(
          `Failed to delete role allocation: ${error?.response?.data?.error || error?.message || 'Please try again.'}`
        );
      }
    } else {
      // Just remove from state if not saved yet
      setRoleAllocations((prev) => prev.filter((r) => r.roleID !== roleID));
      toast.success(`Role "${role.roleName}" removed from allocation`);
    }
  };

  // Get available roles for dropdown (excludes already allocated)
  const getAvailableRolesForDropdown = () => {
    const allocatedRoleIDs = new Set(roleAllocations.map(r => r.roleID));
    return availableRoles.filter(role => !allocatedRoleIDs.has(role.ID));
  };
  
  const canAddMoreRoles = getAvailableRolesForDropdown().length > 0;
  
  return (
    <div className="bg-white shadow-md rounded-xl p-3 md:p-6 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center gap-2 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">Allocation</h1>
          <p className="mt-2 text-gray-600">
            Allocate user access and fields to documents
          </p>
        </div>
      </header>
      
          {/* Department Selection */}
      <div className="sm:border sm:rounded-md sm:p-4 sm:bg-blue-50 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-sm"
              disabled={loadingDepartments}
            >
              <option value="" hidden>
                {loadingDepartments
                  ? 'Loading departments...'
                  : 'Select Department'}
              </option>
              {departmentOptions.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Document Type
            </label>
            <select
              value={selectedSubDept}
              onChange={(e) => setSelectedSubDept(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-sm"
              disabled={!selectedDept || subDepartmentOptions.length === 0}
            >
              <option value="" hidden>
                {!selectedDept
                  ? 'Select department first'
                  : subDepartmentOptions.length === 0
                  ? 'No document types available'
                  : 'Select Document Type'}
              </option>
              {subDepartmentOptions.map((sub) => (
                <option key={sub.value} value={sub.value}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('fields')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'fields'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-5 h-5" />
            Field Settings
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5" />
            Role Allocations
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'fields' && (
          <div className="w-full sm:border sm:rounded-md sm:p-4 sm:bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-blue-800">
                Field Settings
              </h2>
            </div>
            {fieldsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading fields...</p>
              </div>
            ) : fieldsError ? (
              <div className="text-center py-8">
                <p className="text-red-500">{fieldsError}</p>
              </div>
            ) : fieldsInfo.length === 0 ? (
              <div className="text-center py-8">
                {hasFetchedFields ? (
                  <p className="text-gray-500">No active fields found for this document type.</p>
                ) : (
                  <p className="text-gray-500">
                    Please select Department and Document Type to view fields
                  </p>
                )}
              </div>
            ) : (
              <FieldSettingsPanel
                ref={fieldPanelRef}
                fieldsInfo={fieldsInfo}
                masterFields={masterFieldsList} // Pass master fields for dropdown
                onSave={async (updatedFields) => {
                  try {
                    // Get current fields to check existing FieldNumbers
                    const currentFields = await fetchFieldsByLink(Number(selectedSubDept));
                    const existingFieldNumbers = new Set(
                      currentFields.map((f: Field) => Number(f.FieldNumber)).filter(n => n > 0 && n <= 10)
                    );
                    
                    // Track which FieldNumbers we're assigning in this save operation
                    const assignedFieldNumbers = new Set(existingFieldNumbers);
                    
                    // Find next available FieldNumber (1-10)
                    const getNextAvailableFieldNumber = (): number => {
                      for (let i = 1; i <= 10; i++) {
                        if (!assignedFieldNumbers.has(i)) {
                          return i;
                        }
                      }
                      return 0; // No available slot
                    };
                    
                    // Separate active and inactive fields
                    const activeFields = updatedFields.filter((f: any) => f.active);
                    const inactiveFields = updatedFields.filter((f: any) => !f.active);
                    
                    // Process active fields first - use FieldNumber from slot (1-10)
                    const activePayload = activeFields.map((f: any) => {
                      const fieldInfo = fieldsInfo.find(fi => fi.ID === f.ID);
                      // FieldNumber comes from the slot (1-10) - use it directly
                      // If not provided, try to get from fieldInfo or assign next available
                      let fieldNumber = f.FieldNumber || fieldInfo?.FieldNumber || 0;
                      const fieldID = f.FieldID || fieldInfo?.FieldID;
                      
                      // If field has invalid or no FieldNumber, assign next available
                      if (fieldNumber === 0 || fieldNumber > 10) {
                        fieldNumber = getNextAvailableFieldNumber();
                        if (fieldNumber === 0) {
                          toast.error(`No available field slots (max 10 fields). Please deactivate a field first.`);
                          throw new Error('No available field slots');
                        }
                        assignedFieldNumbers.add(fieldNumber);
                      } else {
                        // FieldNumber is valid (1-10), mark it as assigned
                        assignedFieldNumbers.add(fieldNumber);
                      }
                      
                      // Ensure FieldNumber is valid (1-10)
                      if (fieldNumber < 1 || fieldNumber > 10) {
                        console.warn(`Invalid FieldNumber ${fieldNumber} for field ${f.Field || f.Description}, skipping`);
                        return null;
                      }
                      
                      return {
                        FieldID: fieldID,
                        FieldNumber: fieldNumber,
                        Active: true,
                        Description: f.Description ?? f.Field ?? '',
                        DataType: (String(f.Type || '').toLowerCase() === 'date' ? 'Date' : 'Text'),
                      };
                    }).filter((f): f is NonNullable<typeof f> => f !== null);
                    
                    // Process inactive fields - include fields that have FieldID but are inactive
                    // For new fields (not in DB yet), skip them if inactive (don't create inactive entries)
                    // For existing fields (in DB), include them to deactivate
                    const inactivePayload = inactiveFields.map((f: any) => {
                      const fieldInfo = fieldsInfo.find(fi => fi.ID === f.ID);
                      // Use FieldNumber from the field itself (from slot) or from fieldInfo
                      let fieldNumber = f.FieldNumber || fieldInfo?.FieldNumber || 0;
                      const fieldID = f.FieldID || fieldInfo?.FieldID;
                      
                      // Skip if no FieldID (field not selected)
                      if (!fieldID) {
                        return null;
                      }
                      
                      // If field has FieldID but no FieldNumber, it's a new field - skip if inactive
                      // (Don't create inactive entries for new fields - only activate new fields)
                      if (!fieldNumber || fieldNumber === 0) {
                        // New field that's inactive - don't send it (user can select but not activate)
                        return null;
                      }
                      
                      // Existing field that's being deactivated - include it
                      // OR new field with FieldNumber from slot that's inactive - skip it (don't create inactive)
                      // Only send if it exists in DB (has valid FieldNumber from DB, not just from slot)
                      const existsInDB = fieldInfo && fieldInfo.FieldNumber && fieldInfo.FieldNumber >= 1 && fieldInfo.FieldNumber <= 10;
                      
                      if (existsInDB && fieldNumber >= 1 && fieldNumber <= 10) {
                        return {
                          FieldID: fieldID,
                          FieldNumber: fieldNumber,
                          Active: false,
                          Description: f.Description ?? f.Field ?? '',
                          DataType: (String(f.Type || '').toLowerCase() === 'date' ? 'Date' : 'Text'),
                        };
                      }
                      
                      // Skip new inactive fields (don't create them in DB)
                      return null;
                    }).filter((f): f is NonNullable<typeof f> => f !== null);
                    
                    // Combine active and inactive fields
                    const payloadFields = [...activePayload, ...inactivePayload];
                    
                    // Validate payload - ensure all fields have required properties
                    const validPayload = payloadFields.filter(f => {
                      // Must have FieldNumber (1-10) and FieldID
                      return f.FieldNumber >= 1 && f.FieldNumber <= 10 && f.FieldID;
                    });
                    
                    // If no valid fields to save, show message
                    if (validPayload.length === 0 && payloadFields.length > 0) {
                      toast.error('No valid fields to save. Please ensure fields are properly configured.');
                      return;
                    }

                    // Persist exact states; no need to use deactivateMissing when sending all
                    await updateFieldsByLink(Number(selectedSubDept), validPayload, { deactivateMissing: false });

                    setSavedFieldsData(updatedFields);
                    toast.success('Fields updated');

                    // Refresh by merging available + current + ALL master fields so the list always shows all fields
                    setFieldsLoading(true);
                    const [availableFromBackend, current, masterFields] = await Promise.all([
                      fetchAvailableFields(Number(selectedDept), Number(selectedSubDept)),
                      fetchFieldsByLink(Number(selectedSubDept)),
                      fetchOCRFields().catch(() => []), // Fetch all master fields, fallback to empty if fails
                    ]);
                    
                    // Store master fields for dropdown
                    setMasterFieldsList(masterFields || []);
                    
                    // Map all master fields to available fields format
                    const allMasterFields = (masterFields || []).map((mf: any) => ({
                      ID: mf.ID,
                      FieldID: mf.ID,
                      Field: mf.Field,
                      MasterField: mf.Field,
                      Description: mf.Field,
                      Type: 'text',
                      DepartmentId: Number(selectedDept),
                      SubDepartmentId: Number(selectedSubDept),
                      UserId: 0,
                      View: true,
                      Add: false,
                      Edit: true,
                      Delete: false,
                      Print: false,
                      Confidential: false,
                      IsActive: false,
                      FieldNumber: 0,
                    })) as any;
                    
                    // Merge: Use backend available fields if they exist, otherwise use master fields
                    const availableMap = new Map<number, any>();
                    allMasterFields.forEach((mf: any) => {
                      availableMap.set(mf.ID, mf);
                    });
                    (availableFromBackend || []).forEach((af: any) => {
                      const fieldID = af.FieldID ?? af.ID;
                      if (availableMap.has(fieldID)) {
                        availableMap.set(fieldID, {
                          ...availableMap.get(fieldID),
                          ...af,
                          FieldID: fieldID,
                        });
                      } else {
                        availableMap.set(fieldID, {
                          ...af,
                          FieldID: fieldID,
                        });
                      }
                    });
                    const available = Array.from(availableMap.values());
                    
                    // Build map from current by-link - key by FieldID to match master fields
                    const currentMapByFieldID = new Map<number, Field>(
                      (current || []).map((c: Field) => [Number(c.FieldID || 0), c])
                    );
                    // Also build map by FieldNumber for fallback
                    const currentMapByFieldNumber = new Map<number, Field>(
                      (current || []).map((c: Field) => [Number(c.FieldNumber), c])
                    );
                    
                    const baseList: FieldInfo[] = (available || []).map((f: any) => {
                      const fieldID = f.FieldID ?? f.ID; // Get FieldID from available fields (link to master)
                      // Match by FieldID first (preferred), then by FieldNumber as fallback
                      // Also try matching by FieldNumber from available field if FieldID match fails
                      const currentMatch = currentMapByFieldID.get(fieldID) || 
                                         currentMapByFieldNumber.get(Number((f.FieldNumber || f.ID) ?? 0)) ||
                                         (f.FieldNumber ? currentMapByFieldNumber.get(Number(f.FieldNumber)) : null);
                      const activeVal = currentMatch ? (currentMatch as any).Active : (f as any)?.Active;
                      const masterFieldName = f.Field ?? f.MasterField ?? ''; // Master field name
                      const currentDescription = currentMatch?.Description ?? '';
                      
                      // Display logic: If FieldID exists and Description matches master, use master (for cascade updates)
                      // Otherwise, use Description (for custom names)
                      const displayField = fieldID && currentDescription === masterFieldName
                        ? masterFieldName // Use master (will update when master changes)
                        : (currentDescription || masterFieldName || f.Description || '');
                      
                      // Use FieldNumber from current match if exists, otherwise use a placeholder
                      const fieldNumber = currentMatch ? Number(currentMatch.FieldNumber) : (f.FieldNumber || 0);
                      
                      // Create unique ID: Use FieldNumber if linked, otherwise use FieldID + offset
                      const uniqueID = fieldNumber > 0 ? fieldNumber : (fieldID + 10000);
                      
                      // Prioritize DataType from currentMatch (DB), then from available field, then default to 'text'
                      // Convert DataType to lowercase for consistency ('Date' -> 'date', 'Text' -> 'text')
                      const dataType = currentMatch?.DataType 
                        ? String(currentMatch.DataType).toLowerCase()
                        : (f.DataType 
                          ? String(f.DataType).toLowerCase()
                          : (f.Type 
                            ? String(f.Type).toLowerCase()
                            : 'text'));
                      
                      return {
                        ID: uniqueID, // Unique ID for React key
                        FieldID: fieldID, // Track FieldID to link to master
                        FieldNumber: fieldNumber, // Store FieldNumber separately for saving
                        Field: displayField,
                        Type: dataType, // Use properly prioritized DataType
                        updatedAt: '',
                        createdAt: '',
                        IsActive:
                          activeVal === 1 || activeVal === '1' || activeVal === true || activeVal === 'true',
                      } as FieldInfo;
                    });
                    // Create a set of all FieldIDs and FieldNumbers from baseList to prevent duplicates
                    const baseFieldIDs = new Set(baseList.map(b => b.FieldID).filter(id => id && id > 0));
                    const baseFieldNumbers = new Set(baseList.map(b => b.FieldNumber).filter(num => num && num > 0));
                    const baseIDs = new Set(baseList.map(b => b.ID));
                    
                    const union: FieldInfo[] = [
                      ...baseList,
                      ...(current || [])
                        .filter((c: Field) => {
                          const fieldID = c.FieldID || 0;
                          const fieldNumber = Number(c.FieldNumber);
                          // Only include if:
                          // 1. FieldID is 0 (unlinked) AND FieldNumber not in baseList, OR
                          // 2. FieldID exists but not in baseList (shouldn't happen, but safety check)
                          return (fieldID === 0 && !baseFieldNumbers.has(fieldNumber) && !baseIDs.has(fieldNumber)) ||
                                 (fieldID > 0 && !baseFieldIDs.has(fieldID));
                        })
                        .map((c: Field) => {
                          const fieldNumber = Number(c.FieldNumber);
                          return {
                            ID: fieldNumber, // Use FieldNumber as ID for linked fields
                            FieldID: c.FieldID || 0, // Preserve FieldID from current fields
                            FieldNumber: fieldNumber, // Store FieldNumber
                            Field: c.Description,
                            Type: String(c.DataType || 'text').toLowerCase(),
                            updatedAt: '',
                            createdAt: '',
                            IsActive:
                              (c as any).Active === 1 ||
                              (c as any).Active === '1' ||
                              (c as any).Active === true ||
                              (c as any).Active === 'true',
                          } as FieldInfo;
                        }),
                    ];
                    
                    // Final deduplication by ID to ensure no duplicates
                    const uniqueUnion = Array.from(
                      new Map(union.map(f => [f.ID, f])).values()
                    );
                    setFieldsInfo(uniqueUnion);
                    setHasFetchedFields(true);
                  } catch (err: any) {
                    console.error('Failed to save fields:', err);
                    toast.error(err?.response?.data?.error || 'Failed to save fields');
                  } finally {
                    setFieldsLoading(false);
                  }
                }}
                onCancel={(resetFields) => {
                  setSavedFieldsData(resetFields);
                }}
                readOnly={!canAdd}
              />
            )}
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="w-full space-y-6">
            {/* Header with Add Role Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-blue-800">
                Role Allocations
              </h2>
              {allocationPermissions?.Add && (
                <Button
                  onClick={() => setShowAddRoleModal(true)}
                  disabled={!canAddMoreRoles}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                    !canAddMoreRoles
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Role
                </Button>
              )}
            </div>

            {/* Role Allocations Cards */}
            {roleAllocations.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {roleAllocations.map((role) => {
                  const canModifyRole = role.allocationId ? canEdit : canAdd;
                  const canRemoveRole = role.allocationId ? canDelete : canAdd;
                  const showUsers = expandedRoles[role.roleID] || false;
                  return (
                    <div
                      key={role.roleID}
                      className={`bg-white border rounded-lg shadow-sm p-5 transition-all ${
                        role.isEditing ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {/* Role Header */}
                      <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800">{role.roleName}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Affects: {role.affectedUsersCount || 0} user{role.affectedUsersCount !== 1 ? 's' : ''}
                          </p>
                          {role.isEditing && (
                            <span className="text-xs text-blue-600 font-medium">Editing Mode</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {role.isEditing ? (
                            <>
                              <Button
                                onClick={() => saveRoleAllocation(role.roleID)}
                                className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Save"
                                disabled={!canModifyRole}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => toggleRoleEditMode(role.roleID)}
                                className="text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-2 rounded"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => setExpandedRoles(prev => ({ ...prev, [role.roleID]: !prev[role.roleID] }))}
                                className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 p-2 rounded"
                                title={showUsers ? "Hide Users" : "View Users"}
                              >
                                <Users className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => toggleRoleEditMode(role.roleID)}
                                className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Edit"
                                disabled={!canModifyRole}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {!role.isEditing && (
                                <DeleteDialog
                                  onConfirm={() => removeRoleAllocation(role.roleID)}
                                >
                                  <Button
                                    className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete Role"
                                    disabled={!canRemoveRole}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </DeleteDialog>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Affected Users List */}
                      {showUsers && role.affectedUsers && role.affectedUsers.length > 0 && (
                        <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-blue-600" />
                            <h4 className="text-sm font-semibold text-blue-900">
                              Affected Users ({role.affectedUsers.length})
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {role.affectedUsers.map((user) => (
                              <div
                                key={user.ID}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                              >
                                <UserCircle className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {user.UserName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Permissions Grid */}
                      <div className="space-y-4">
                        {/* Basic Permissions */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Basic Access
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {(['view', 'add', 'edit', 'delete'] as PermissionKey[]).map((field) => (
                              <label
                                key={field}
                                className="flex items-center gap-2 cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={role[field]}
                                  onChange={() => toggleRolePermission(role.roleID, field)}
                                  disabled={!role.isEditing || !canModifyRole}
                                  className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                    !role.isEditing || !canModifyRole
                                      ? 'cursor-not-allowed opacity-50'
                                      : 'cursor-pointer'
                                  }`}
                                />
                                <span className={`text-sm capitalize ${
                                  !role.isEditing || !canModifyRole
                                    ? 'text-gray-400'
                                    : 'text-gray-700 group-hover:text-blue-600'
                                }`}>
                                  {field}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Advanced Permissions */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Advanced Access
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {(['print', 'confidential', 'comment', 'collaborate'] as PermissionKey[]).map((field) => (
                              <label
                                key={field}
                                className="flex items-center gap-2 cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={role[field]}
                                  onChange={() => toggleRolePermission(role.roleID, field)}
                                  disabled={!role.isEditing || !canModifyRole}
                                  className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                    !role.isEditing || !canModifyRole
                                      ? 'cursor-not-allowed opacity-50'
                                      : 'cursor-pointer'
                                  }`}
                                />
                                <span className={`text-sm capitalize ${
                                  !role.isEditing || !canModifyRole
                                    ? 'text-gray-400'
                                    : 'text-gray-700 group-hover:text-blue-600'
                                }`}>
                                  {field}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Special Permissions */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Special Permissions
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {(['finalize', 'masking'] as PermissionKey[]).map((field) => (
                              <label
                                key={field}
                                className="flex items-center gap-2 cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={role[field]}
                                  onChange={() => toggleRolePermission(role.roleID, field)}
                                  disabled={!role.isEditing || !canModifyRole}
                                  className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                    !role.isEditing || !canModifyRole
                                      ? 'cursor-not-allowed opacity-50'
                                      : 'cursor-pointer'
                                  }`}
                                />
                                <span className={`text-sm capitalize ${
                                  !role.isEditing || !canModifyRole
                                    ? 'text-gray-400'
                                    : 'text-gray-700 group-hover:text-blue-600'
                                }`}>
                                  {field}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No roles allocated</p>
                <p className="text-gray-400 text-sm mt-2">Click "Add Role" to start allocating permissions</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h2 className="text-xl font-semibold text-gray-800">Add New Role</h2>
              <button
                onClick={() => {
                  setShowAddRoleModal(false);
                  setNewRoleID('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Role
                </label>
                <select
                  value={newRoleID}
                  onChange={(e) => setNewRoleID(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" hidden>
                    Choose a role to add...
                  </option>
                  {getAvailableRolesForDropdown().map((role) => (
                    <option key={role.ID} value={role.ID}>
                      {role.Description}
                    </option>
                  ))}
                </select>
                {getAvailableRolesForDropdown().length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">All available roles have been allocated.</p>
                )}
              </div>

              {/* Permission Groups Preview */}
              {newRoleID && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-800 mb-3">Default Permissions</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">View</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-500">All other permissions disabled</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">You can edit permissions after adding the role.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <Button
                onClick={() => {
                  setShowAddRoleModal(false);
                  setNewRoleID('');
                }}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRoleAllocation}
                disabled={!newRoleID}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  !newRoleID
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Add Role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
