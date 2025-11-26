import { PlusCircle, Trash2, Pencil, Save, X, Settings, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FieldSettingsPanel } from '../FieldSetting';
import { Button } from '@chakra-ui/react';
// import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
import toast from 'react-hot-toast';
import { allocateFieldsToUsers, updateAllocation, fetchFieldsByLink, Field, updateFieldsByLink, fetchAllocationsByLink, fetchAllocationsByDept, fetchAllAllocations, fetchAllocationByUserAndDept, DocumentAccess } from './utils/allocationServices';
import { fetchAvailableFields } from '../Document/utils/fieldAllocationService';
import { fetchOCRFields } from '../OCR/Fields/ocrFieldService';
import { useNestedDepartmentOptions } from '@/hooks/useNestedDepartmentOptions';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { useUsers } from '../Users/useUser';
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

type UserPermission = {
  username: string;
  isEditing?: boolean;
  allocationId?: number; // Store the allocation ID if it exists
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
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserID, setNewUserID] = useState('');
  const [savedFieldsData, setSavedFieldsData] = useState<updatedFields>([]);
  const [activeTab, setActiveTab] = useState<'fields' | 'users'>('fields');

  // const { departmentOptions, subDepartmentOptions } = useDepartmentOptions();
  const {
    departmentOptions,
    getSubDepartmentOptions,
    loading: loadingDepartments,
  } = useNestedDepartmentOptions();
  const { users: usersList } = useUsers();
  const fieldPanelRef = useRef<any>(null);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsInfo, setFieldsInfo] = useState<FieldInfo[]>([]);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [hasFetchedFields, setHasFetchedFields] = useState(false);
  const [masterFieldsList, setMasterFieldsList] = useState<any[]>([]);

  const [subDepartmentOptions, setSubDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const allocationPermissions = useModulePermissions(7); // 1 = MODULE_ID
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

  // Fetch existing user allocations when Document Type is selected
  useEffect(() => {
    const fetchExistingAllocations = async () => {
      if (!selectedSubDept || !usersList || usersList.length === 0) {
        setUsers([]);
        return;
      }

      try {
        // Try fetching by department + subdepartment first (more reliable)
        console.log('Fetching allocations for dept:', selectedDept, 'subdept:', selectedSubDept);
        let allocations = await fetchAllocationsByDept(selectedDept, selectedSubDept);
        
        console.log(`Initial fetch returned ${allocations.length} allocations`);
        const fetchedUserIDs = allocations.map((a: any) => Number(a.UserID));
        console.log('Fetched UserIDs:', fetchedUserIDs);
        
        // WORKAROUND: If backend doesn't return all allocations, try alternative methods
        // First, try fetching by LinkID which might return more complete results
        const usersInList = usersList.map((u: any) => Number(u.ID));
        const missingUsers = usersInList.filter(userId => !fetchedUserIDs.includes(userId));
        console.log('Users in list but not in fetched allocations:', missingUsers);
        
        // If there are missing users, try alternative fetch methods
        if (missingUsers.length > 0) {
          console.log('Some users missing from dept endpoint, trying alternative methods...');
          
          // First, try fetching by LinkID (subdepartment) which might be more complete
          try {
            const linkAllocs = await fetchAllocationsByLink(selectedSubDept);
            if (linkAllocs && linkAllocs.length > 0) {
              console.log(`Fetched ${linkAllocs.length} allocations via LinkID endpoint`);
              const linkUserIDs = linkAllocs.map((a: any) => Number(a.UserID));
              const stillMissing = missingUsers.filter(userId => !linkUserIDs.includes(userId));
              
              // Merge LinkID allocations with existing ones (deduplicate by UserID)
              const existingUserIDs = new Set(allocations.map((a: any) => Number(a.UserID)));
              const newFromLink = linkAllocs.filter((a: any) => !existingUserIDs.has(Number(a.UserID)));
              
              if (newFromLink.length > 0) {
                allocations = [...allocations, ...newFromLink];
                console.log(`✅ Added ${newFromLink.length} allocations from LinkID endpoint. Total now: ${allocations.length}`);
              }
              
              // Update missing users list after LinkID fetch
              const updatedFetchedUserIDs = allocations.map((a: any) => Number(a.UserID));
              const stillMissingAfterLink = usersInList.filter(userId => !updatedFetchedUserIDs.includes(userId));
              
              if (stillMissingAfterLink.length > 0) {
                console.log(`Still missing ${stillMissingAfterLink.length} users after LinkID fetch:`, stillMissingAfterLink);
                console.log(`Attempting to fetch missing user allocations individually...`);
                
                // Try individual user endpoint for remaining missing users
                const missingAllocs: any[] = [];
                for (const userId of stillMissingAfterLink) {
                  try {
                    console.log(`Fetching allocation for UserID ${userId}, Dept ${selectedDept}, SubDept ${selectedSubDept}...`);
                    const alloc = await fetchAllocationByUserAndDept(
                      userId,
                      Number(selectedDept),
                      selectedSubDept
                    );
                    if (alloc) {
                      console.log(`✅ Found missing allocation for UserID ${userId}:`, alloc);
                      missingAllocs.push(alloc);
                    }
                  } catch (err: any) {
                    // Silently continue if individual fetch fails
                    if (err?.response?.status !== 404) {
                      console.log(`Error fetching allocation for UserID ${userId}:`, err?.response?.status);
                    }
                  }
                }
                
                if (missingAllocs.length > 0) {
                  allocations = [...allocations, ...missingAllocs];
                  console.log(`✅ Added ${missingAllocs.length} allocations from individual user endpoint. Total now: ${allocations.length}`);
                }
                
                // Last resort: fetch all allocations and filter by matching users
                const finalFetchedUserIDs = allocations.map((a: any) => Number(a.UserID));
                const stillMissingFinal = usersInList.filter(userId => !finalFetchedUserIDs.includes(userId));
                
                if (stillMissingFinal.length > 0) {
                  console.log(`⚠️ Still missing ${stillMissingFinal.length} users after all methods. Trying fetch-all approach...`);
                  try {
                    const allAllocs = await fetchAllAllocations();
                    console.log(`Fetched ${allAllocs.length} total allocations from /allocation/all`);
                    
                    // Filter to only include allocations for users that are in our missing list
                    // This prevents adding allocations from other departments
                    const missingUserSet = new Set(stillMissingFinal);
                    const existingUserIDsSet = new Set(allocations.map((a: any) => Number(a.UserID)));
                    
                    const relevantAllocs = allAllocs.filter((a: any) => {
                      const userId = Number(a.UserID);
                      // Only include if user is in missing list and not already in allocations
                      return missingUserSet.has(userId) && !existingUserIDsSet.has(userId);
                    });
                    
                    if (relevantAllocs.length > 0) {
                      console.log(`Found ${relevantAllocs.length} additional allocations for missing users:`, relevantAllocs.map((a: any) => ({ UserID: a.UserID, id: a.id })));
                      allocations = [...allocations, ...relevantAllocs];
                      console.log(`✅ Added ${relevantAllocs.length} missing allocations. Total now: ${allocations.length}`);
                    } else {
                      console.log(`No additional allocations found for missing users in fetch-all`);
                    }
                  } catch (err: any) {
                    console.log(`Could not fetch all allocations:`, err?.response?.status || err?.message);
                  }
                }
              }
            }
          } catch (err: any) {
            console.log(`LinkID fetch failed, trying individual user endpoints...`, err?.response?.status || err?.message);
            
            // Fallback to individual user endpoint
            const missingAllocs: any[] = [];
            for (const userId of missingUsers) {
              try {
                const alloc = await fetchAllocationByUserAndDept(
                  userId,
                  Number(selectedDept),
                  selectedSubDept
                );
                if (alloc) {
                  console.log(`✅ Found missing allocation for UserID ${userId}:`, alloc);
                  missingAllocs.push(alloc);
                }
              } catch (err: any) {
                // Silently continue
              }
            }
            
            if (missingAllocs.length > 0) {
              allocations = [...allocations, ...missingAllocs];
              console.log(`✅ Added ${missingAllocs.length} missing allocations. Total now: ${allocations.length}`);
            }
          }
        }
        
        // If that returns empty, try by LinkID as fallback
        if (!allocations || allocations.length === 0) {
          console.log('Fetch by dept returned empty, trying by LinkID...');
          allocations = await fetchAllocationsByLink(selectedSubDept);
        }
        
        // Deduplicate allocations by UserID - keep only the most recent one (highest id) for each user
        const allocationsByUser = new Map<number, DocumentAccess>();
        allocations.forEach((alloc: any) => {
          const userId = Number(alloc.UserID);
          const existing = allocationsByUser.get(userId);
          if (!existing || Number(alloc.id) > Number(existing.id)) {
            allocationsByUser.set(userId, alloc);
          }
        });
        allocations = Array.from(allocationsByUser.values());
        console.log(`Deduplicated allocations: ${allocations.length} unique users`);
        
        console.log('Received allocations:', allocations);
        console.log('Allocations details:', allocations.map(a => ({
          id: a.id,
          UserID: a.UserID,
          LinkID: a.LinkID,
          Active: a.Active,
          View: a.View,
          Add: a.Add,
          Edit: a.Edit,
          Delete: a.Delete
        })));
        
        // Check if UserID 29 exists in allocations
        const user29Alloc = allocations.find((a: any) => Number(a.UserID) === 29);
        if (user29Alloc) {
          console.log('Found UserID 29 allocation:', user29Alloc);
        } else {
          console.log('UserID 29 NOT FOUND in fetched allocations. Available UserIDs:', allocations.map((a: any) => a.UserID));
        }
        
        if (allocations && allocations.length > 0) {
          // Helper function to check if allocation is active
          const isActive = (alloc: any): boolean => {
            const active = alloc.Active;
            if (typeof active === 'boolean') return active;
            if (typeof active === 'number') return active === 1;
            if (typeof active === 'string') return active === '1' || active === 'true' || active === 'True';
            return true; // Default to true if unknown
          };
          
          // Log ALL allocations before filtering
          console.log('All allocations before filtering:', allocations.map(a => ({
            id: a.id,
            UserID: a.UserID,
            Active: a.Active,
            isActive: isActive(a)
          })));
          
          // Map DocumentAccess records to UserPermission format
          const mappedUsers: UserPermission[] = allocations
            .filter((alloc: DocumentAccess) => {
              const active = isActive(alloc);
              console.log(`Allocation ${alloc.id} for User ${alloc.UserID} - Active: ${alloc.Active} (${typeof alloc.Active}) -> ${active}`);
              return active;
            })
            .map((alloc: DocumentAccess) => {
              const user = usersList.find((u: any) => Number(u.ID) === Number(alloc.UserID));
              
              // Helper function to convert any value to boolean
              const toBool = (val: any): boolean => {
                if (typeof val === 'boolean') return val;
                if (typeof val === 'number') return val === 1;
                if (typeof val === 'string') return val === '1' || val === 'true' || val === 'True';
                return false;
              };
              
              console.log(`Mapping user ${alloc.UserID} (${user?.UserName || 'Unknown'}) - View: ${alloc.View} (${typeof alloc.View}), Add: ${alloc.Add} (${typeof alloc.Add}), Edit: ${alloc.Edit} (${typeof alloc.Edit}), Delete: ${alloc.Delete} (${typeof alloc.Delete})`); // Debug log
              
              const mappedUser = {
                username: user?.UserName || `User ${alloc.UserID}`,
                allocationId: alloc.id, // Store the allocation ID for updates
                // Convert database values to boolean (handles both number 0/1 and boolean)
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
              };
              
              console.log(`Mapped user result - username: ${mappedUser.username}, view: ${mappedUser.view}, add: ${mappedUser.add}, edit: ${mappedUser.edit}, delete: ${mappedUser.delete}`);
              return mappedUser;
            });
          
          console.log('Mapped users:', mappedUsers);
          console.log('Mapped users details:', mappedUsers.map(u => ({
            username: u.username,
            view: u.view,
            add: u.add,
            edit: u.edit,
            delete: u.delete
          })));
          console.log('Setting users to state:', mappedUsers.length, 'users');
          setUsers(mappedUsers);
          
          // Also set savedFieldsData from the first allocation's fields (they should be the same)
          if (allocations[0]?.fields && Array.isArray(allocations[0].fields) && allocations[0].fields.length > 0) {
            setSavedFieldsData(allocations[0].fields.map((f: any) => ({
              ID: f.ID,
              Field: f.Field || f.Description || '',
              Type: f.Type || 'text',
              Description: f.Description || f.Field || '',
            })));
          }
        } else {
          setUsers([]);
          setSavedFieldsData([]);
        }
      } catch (error) {
        console.error('Failed to fetch existing allocations:', error);
        setUsers([]);
        setSavedFieldsData([]);
      }
    };

    fetchExistingAllocations();
  }, [selectedSubDept, usersList]);

  const togglePermission = (username: string, field: PermissionKey) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.username === username ? { ...user, [field]: !user[field] } : user
      )
    );
  };

  const toggleEditMode = (username: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.username === username
          ? { ...user, isEditing: !user.isEditing }
          : { ...user, isEditing: false }
      )
    );
  };

  const saveUser = async (username: string) => {
    if (!selectedDept || !selectedSubDept) {
      toast.error('Please select Department and Document Type first.');
      return;
    }

    const user = users.find((u) => u.username === username);
    if (!user) {
      toast.error('User not found');
      return;
    }

    const userID = (usersList || [])?.find(
      (item) => item.UserName === username
    )?.ID;

    if (!userID) {
      toast.error('User ID not found');
      return;
    }

    const payload = {
      depid: Number(selectedDept),
      subdepid: Number(selectedSubDept),
      userid: Number(userID),
      View: user.view ? 1 : 0,
      Add: user.add ? 1 : 0,
      Edit: user.edit ? 1 : 0,
      Delete: user.delete ? 1 : 0,
      Print: user.print ? 1 : 0,
      Confidential: user.confidential ? 1 : 0,
      Comment: user.comment ? 1 : 0,
      Collaborate: user.collaborate ? 1 : 0,
      Finalize: user.finalize ? 1 : 0,
      Masking: user.masking ? 1 : 0,
      fields: savedFieldsData.map((field) => ({
        ID: Number(field.ID),
        Field: field.Field,
        Type: field.Type,
        Description: field.Description || '',
      })),
    };

    try {
      // If allocationId exists, update; otherwise create new
      if (user.allocationId) {
        await updateAllocation(user.allocationId, payload);
      } else {
        // Try to create, but if 409 error, try to update instead
        try {
          await allocateFieldsToUsers(payload);
        } catch (createError: any) {
          if (createError?.response?.status === 409) {
            // User already exists, try to fetch the allocation
            console.log(`409 Conflict: Allocation exists for UserID ${userID}, searching for it...`);
            let existingAlloc: DocumentAccess | null = null;
            
            // Check if error response contains allocation data first
            if (createError?.response?.data?.data) {
              existingAlloc = createError.response.data.data;
              console.log(`Found allocation in error response:`, existingAlloc);
            }
            
            // If not in error response, try multiple search methods
            if (!existingAlloc) {
              // First try by department + subdepartment
              let allocations = await fetchAllocationsByDept(selectedDept, selectedSubDept);
              existingAlloc = allocations.find(
                (a: DocumentAccess) => Number(a.UserID) === Number(userID)
              ) || null;
              
              if (existingAlloc) {
                console.log(`Found allocation via dept endpoint`);
              }
            }
            
            // If not found, try by LinkID
            if (!existingAlloc) {
              console.log('Allocation not found by dept, trying by LinkID...');
              const linkAllocs = await fetchAllocationsByLink(selectedSubDept);
              existingAlloc = linkAllocs.find(
                (a: DocumentAccess) => Number(a.UserID) === Number(userID)
              ) || null;
              
              if (existingAlloc) {
                console.log(`Found allocation via LinkID endpoint`);
              }
            }
            
            // If still not found, try fetching by user + dept + subdept
            if (!existingAlloc) {
              console.log('Allocation not found, trying by user+dept+subdept...');
              const alloc = await fetchAllocationByUserAndDept(
                Number(userID),
                Number(selectedDept),
                selectedSubDept
              );
              if (alloc) {
                existingAlloc = alloc;
                console.log(`Found allocation via user+dept+subdept endpoint`);
              }
            }
            
            // Last resort: fetch all allocations and filter
            if (!existingAlloc) {
              console.log('Trying fetch-all approach as last resort...');
              try {
                const allAllocs = await fetchAllAllocations();
                // Filter to find allocation for this specific user
                existingAlloc = allAllocs.find(
                  (a: DocumentAccess) => Number(a.UserID) === Number(userID)
                ) || null;
                
                if (existingAlloc) {
                  console.log(`Found allocation via fetch-all approach`);
                }
              } catch (err: any) {
                console.log(`Fetch-all failed:`, err?.message);
              }
            }
            
            if (existingAlloc) {
              console.log(`Updating existing allocation ID ${existingAlloc.id} for UserID ${userID}`);
              await updateAllocation(existingAlloc.id, payload);
              // Update the user's allocationId in state
              setUsers((prev) =>
                prev.map((u) =>
                  u.username === username ? { ...u, allocationId: existingAlloc!.id } : u
                )
              );
            } else {
              // If still not found, show error but don't throw - user can try again
              console.error(`Could not find existing allocation to update for UserID ${userID}`);
              console.error(`Searched via: dept endpoint, LinkID endpoint, user+dept+subdept endpoint, and fetch-all`);
              toast.error(`User ${username} already exists but allocation not found. Please refresh and try again.`);
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }
      
      // Reload allocations to reflect saved changes
      let allocations = await fetchAllocationsByDept(selectedDept, selectedSubDept);
      if (!allocations || allocations.length === 0) {
        allocations = await fetchAllocationsByLink(selectedSubDept);
      }
      if (allocations && allocations.length > 0) {
        // Helper function to check if allocation is active
        const isActive = (alloc: any): boolean => {
          const active = alloc.Active;
          if (typeof active === 'boolean') return active;
          if (typeof active === 'number') return active === 1;
          if (typeof active === 'string') return active === '1' || active === 'true' || active === 'True';
          return true; // Default to true if unknown
        };
        
        const mappedUsers: UserPermission[] = allocations
          .filter((alloc: DocumentAccess) => isActive(alloc))
          .map((alloc: DocumentAccess) => {
            const user = usersList.find((u: any) => Number(u.ID) === Number(alloc.UserID));
            
            // Helper function to convert any value to boolean
            const toBool = (val: any): boolean => {
              if (typeof val === 'boolean') return val;
              if (typeof val === 'number') return val === 1;
              if (typeof val === 'string') return val === '1' || val === 'true' || val === 'True';
              return false;
            };
            
            return {
              username: user?.UserName || `User ${alloc.UserID}`,
              allocationId: alloc.id,
              // Convert database values to boolean (handles both number 0/1 and boolean)
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
            };
          });
        setUsers(mappedUsers);
      }
      
      toast.success(`Permissions saved for ${username}`);
    } catch (error: any) {
      console.error('Save user failed:', error);
      toast.error(
        `Failed to save: ${error?.response?.data?.error || 'Please try again.'}`
      );
    }
  };

  const addUser = () => {
    // FINDING THE SELECTED ACCESS LEVEL
    // const newUserLabel = accessOptions?.items?.find(
    //   (item: any) => item.value === newUsername
    // ) as { value: string; label: string };
    const newUserLabel = usersList?.find(
      (item: any) => Number(item.ID) === Number(newUserID)
    );
    // CHECKING IF THE USER ALREADY EXISTS
    if (users.some((u) => u.username === newUserLabel?.UserName)) {
      toast.error('User already exists');
      return;
    }
    console.log({ usersList });
    // ADDING THE NEW USER
    setUsers([
      ...users,
      {
        username: newUserLabel?.UserName || '',
        allocationId: undefined, // New user, no allocation ID yet
        view: true,
        add: false,
        edit: false,
        delete: false,
        print: false,
        confidential: false,
        comment: false,
        collaborate: false,
        finalize: false,
        masking: false,
        isEditing: false,
      },
    ]);

    setNewUserID('');
    setShowAddUserModal(false);
  };

  const removeUser = (username: string) => {
    if (username !== 'admin') {
      setUsers(users.filter((user) => user.username !== username));
    }
  };

  const handleAllocation = async () => {
    if (!selectedDept || !selectedSubDept || users.length === 0) {
      toast.error('Please select Department, Document Type, and add at least one user.');
      return;
    }

    // Save ALL users, not just the first one
    const savePromises = users.map(async (user) => {
      const userID = (usersList || [])?.find(
        (item) => item.UserName === user.username
      )?.ID;

      if (!userID) {
        console.warn(`User ID not found for ${user.username}`);
        return null;
      }

      const payload = {
        depid: Number(selectedDept),
        subdepid: Number(selectedSubDept),
        userid: Number(userID),
        View: user.view ? 1 : 0,
        Add: user.add ? 1 : 0,
        Edit: user.edit ? 1 : 0,
        Delete: user.delete ? 1 : 0,
        Print: user.print ? 1 : 0,
        Confidential: user.confidential ? 1 : 0,
        Comment: user.comment ? 1 : 0,
        Collaborate: user.collaborate ? 1 : 0,
        Finalize: user.finalize ? 1 : 0,
        Masking: user.masking ? 1 : 0,
        fields: savedFieldsData.map((field) => ({
          ID: Number(field.ID),
          Field: field.Field,
          Type: field.Type,
          Description: field.Description || '',
        })),
      };

      try {
        // If allocationId exists, update; otherwise try to create
        if (user.allocationId) {
          await updateAllocation(user.allocationId, payload);
          return { username: user.username, success: true };
        } else {
          // Try to create, but if 409 error, try to update instead
          try {
            await allocateFieldsToUsers(payload);
            return { username: user.username, success: true };
          } catch (createError: any) {
            if (createError?.response?.status === 409) {
              // User already exists, try to fetch the allocation
              console.log(`409 Conflict: Allocation exists for UserID ${userID}, searching for it...`);
              let existingAlloc: DocumentAccess | null = null;
              
              // Check if error response contains allocation data first
              if (createError?.response?.data?.data) {
                existingAlloc = createError.response.data.data;
                console.log(`Found allocation in error response:`, existingAlloc);
              }
              
              // If not in error response, try multiple search methods
              if (!existingAlloc) {
                // First try by department + subdepartment
                let allocations = await fetchAllocationsByDept(selectedDept, selectedSubDept);
                existingAlloc = allocations.find(
                  (a: DocumentAccess) => Number(a.UserID) === Number(userID)
                ) || null;
                
                if (existingAlloc) {
                  console.log(`Found allocation via dept endpoint`);
                }
              }
              
              // If not found, try by LinkID
              if (!existingAlloc) {
                console.log('Allocation not found by dept, trying by LinkID...');
                const linkAllocs = await fetchAllocationsByLink(selectedSubDept);
                existingAlloc = linkAllocs.find(
                  (a: DocumentAccess) => Number(a.UserID) === Number(userID)
                ) || null;
                
                if (existingAlloc) {
                  console.log(`Found allocation via LinkID endpoint`);
                }
              }
              
              // If still not found, try fetching by user + dept + subdept
              if (!existingAlloc) {
                console.log('Allocation not found, trying by user+dept+subdept...');
                const alloc = await fetchAllocationByUserAndDept(
                  Number(userID),
                  Number(selectedDept),
                  selectedSubDept
                );
                if (alloc) {
                  existingAlloc = alloc;
                  console.log(`Found allocation via user+dept+subdept endpoint`);
                }
              }
              
              // Last resort: fetch all allocations and filter
              if (!existingAlloc) {
                console.log('Trying fetch-all approach as last resort...');
                try {
                  const allAllocs = await fetchAllAllocations();
                  // Filter to find allocation for this specific user, dept, and subdept
                  // We'll match by UserID and check if it might belong to this dept/subdept
                  existingAlloc = allAllocs.find(
                    (a: DocumentAccess) => Number(a.UserID) === Number(userID)
                  ) || null;
                  
                  if (existingAlloc) {
                    console.log(`Found allocation via fetch-all approach`);
                  }
                } catch (err: any) {
                  console.log(`Fetch-all failed:`, err?.message);
                }
              }
              
              if (existingAlloc) {
                console.log(`Updating existing allocation ID ${existingAlloc.id} for UserID ${userID}`);
                await updateAllocation(existingAlloc.id, payload);
                return { username: user.username, success: true };
              } else {
                console.error(`Could not find existing allocation to update for UserID ${userID}`);
                console.error(`Searched via: dept endpoint, LinkID endpoint, user+dept+subdept endpoint, and fetch-all`);
                return { 
                  username: user.username, 
                  success: false, 
                  error: 'Allocation exists but could not be found to update' 
                };
              }
            } else {
              throw createError;
            }
          }
        }
      } catch (error: any) {
        console.error(`Failed to allocate for ${user.username}:`, error);
        return { 
          username: user.username, 
          success: false, 
          error: error?.response?.data?.error || 'Unknown error' 
        };
      }
    });

    try {
      const results = await Promise.all(savePromises);
      const successful = results.filter(r => r && r.success).length;
      const failed = results.filter(r => r && !r.success);

      if (failed.length > 0) {
        toast.error(`${failed.length} user(s) failed to save. ${successful} user(s) saved successfully.`);
        failed.forEach(f => {
          if (f) {
            console.error(`Failed for ${f.username}:`, f.error);
          }
        });
      } else {
        toast.success(`All ${successful} user(s) allocated successfully`);
      }

      // Reload allocations to reflect saved changes
      if (successful > 0) {
        let allocations = await fetchAllocationsByDept(selectedDept, selectedSubDept);
        if (!allocations || allocations.length === 0) {
          allocations = await fetchAllocationsByLink(selectedSubDept);
        }
        if (allocations && allocations.length > 0) {
          // Helper function to check if allocation is active
          const isActive = (alloc: any): boolean => {
            const active = alloc.Active;
            if (typeof active === 'boolean') return active;
            if (typeof active === 'number') return active === 1;
            if (typeof active === 'string') return active === '1' || active === 'true' || active === 'True';
            return true; // Default to true if unknown
          };
          
          // Helper function to convert any value to boolean
          const toBool = (val: any): boolean => {
            if (typeof val === 'boolean') return val;
            if (typeof val === 'number') return val === 1;
            if (typeof val === 'string') return val === '1' || val === 'true' || val === 'True';
            return false;
          };
          
          const mappedUsers: UserPermission[] = allocations
            .filter((alloc: DocumentAccess) => isActive(alloc))
            .map((alloc: DocumentAccess) => {
              const user = usersList.find((u: any) => Number(u.ID) === Number(alloc.UserID));
              return {
                username: user?.UserName || `User ${alloc.UserID}`,
                allocationId: alloc.id,
                // Convert database values to boolean (handles both number 0/1 and boolean)
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
              };
            });
          setUsers(mappedUsers);
        }
      }
    } catch (error: any) {
      console.error('Allocation failed:', error);
      toast.error(
        'Failed to allocate: ' + (error?.response?.data?.error || 'Please try again.')
      );
    }
  };
  console.log({ selectedDept, selectedSubDept });
  // console.log({ fieldsInfo });
  const userOptions = usersList?.map((user) => ({
    label: user.UserName,
    value: user.ID,
  }));
  
  // Check if there are any available users to add
  const availableUsersToAdd = userOptions?.filter((user: any) => 
    !users.some((u) => u.username === user.label)
  ) || [];
  const canAddMoreUsers = availableUsersToAdd.length > 0;
  
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
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5" />
            User Permissions
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
              />
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="w-full space-y-6">
            {/* Header with Add User Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-blue-800">
                User Permissions
              </h2>
              {allocationPermissions?.Add && (
                <Button
                  onClick={() => setShowAddUserModal(true)}
                  disabled={!canAddMoreUsers}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                    !canAddMoreUsers
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add User
                </Button>
              )}
            </div>

            {/* Permissions Cards */}
            {users.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map((user) => (
                  <div
                    key={user.username}
                    className={`bg-white border rounded-lg shadow-sm p-5 transition-all ${
                      user.isEditing ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    {/* User Header */}
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{user.username}</h3>
                        {user.isEditing && (
                          <span className="text-xs text-blue-600 font-medium">Editing Mode</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {user.isEditing ? (
                          <>
                            <Button
                              onClick={() => saveUser(user.username)}
                              className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 p-2 rounded"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => toggleEditMode(user.username)}
                              className="text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-2 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => toggleEditMode(user.username)}
                              className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded"
                              title="Edit"
                              disabled={user.username === 'admin'}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => removeUser(user.username)}
                              className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded"
                              title="Delete"
                              disabled={user.username === 'admin'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

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
                                checked={user[field]}
                                onChange={() => togglePermission(user.username, field)}
                                disabled={
                                  (!user.isEditing && user.username !== 'admin') ||
                                  user.username === 'admin'
                                }
                                className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                  user.username === 'admin' || (!user.isEditing && user.username !== 'admin')
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer'
                                }`}
                              />
                              <span className={`text-sm capitalize ${
                                user.username === 'admin' || (!user.isEditing && user.username !== 'admin')
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
                                checked={user[field]}
                                onChange={() => togglePermission(user.username, field)}
                                disabled={
                                  (!user.isEditing && user.username !== 'admin') ||
                                  user.username === 'admin'
                                }
                                className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                  user.username === 'admin' || (!user.isEditing && user.username !== 'admin')
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer'
                                }`}
                              />
                              <span className={`text-sm capitalize ${
                                user.username === 'admin' || (!user.isEditing && user.username !== 'admin')
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
                                checked={user[field]}
                                onChange={() => togglePermission(user.username, field)}
                                disabled={
                                  (!user.isEditing && user.username !== 'admin') ||
                                  user.username === 'admin'
                                }
                                className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                  user.username === 'admin' || (!user.isEditing && user.username !== 'admin')
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer'
                                }`}
                              />
                              <span className={`text-sm capitalize ${
                                user.username === 'admin' || (!user.isEditing && user.username !== 'admin')
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
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No users allocated</p>
                <p className="text-gray-400 text-sm mt-2">Click "Add User" to start allocating permissions</p>
              </div>
            )}

            {/* Footer Allocate Button */}
            <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-gray-200">
              <Button
                onClick={handleAllocation}
                disabled={
                  !Boolean(selectedSubDept) ||
                  !Boolean(selectedDept) ||
                  users.length === 0
                }
                className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium
                  disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
                  bg-blue-600 text-white hover:bg-blue-700 
                `}
              >
                <PlusCircle className="w-4 h-4" />
                Allocate All Users
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h2 className="text-xl font-semibold text-gray-800">Add New User</h2>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserID('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={newUserID}
                  onChange={(e) => setNewUserID(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" hidden>
                    Choose a user to add...
                  </option>
                  {userOptions?.filter((user: any) => !users.some((u) => u.username === user.label)).map((user: any) => (
                    <option key={user.value} value={user.value}>
                      {user.label}
                    </option>
                  ))}
                </select>
                {userOptions?.filter((user: any) => !users.some((u) => u.username === user.label)).length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">All available users have been added.</p>
                )}
              </div>

              {/* Permission Groups Preview */}
              {newUserID && (
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
                  <p className="text-xs text-gray-600 mt-3">You can edit permissions after adding the user.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <Button
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserID('');
                }}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={addUser}
                disabled={!newUserID}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  !newUserID
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Add User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
