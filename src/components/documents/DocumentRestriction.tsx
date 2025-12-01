import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { CurrentDocument } from '@/types/Document';
import { Restriction, RestrictionFormData } from '@/types/Restriction';
import { useDocument } from '@/contexts/DocumentContext';
import {
  fetchDocumentRestrictions,
  removeRestrictedFields,
  restrictFields,
} from './Restriction/Restriction';
import DocumentPreview from './Restriction/DocumentPreview';
import RestrictionForm from './Restriction/RestrictionForm';
import RestrictionList from './Restriction/RestrictionList';
import { logSecurityActivity } from '@/utils/activityLogger';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchRoleAllocations,
  fetchRoleAllocationsByLink,
} from '@/pages/Digitalization/utils/allocationServices';

interface FieldRestrictionProps {
  document: CurrentDocument | null;
}

interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

const toBool = (val: any): boolean => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
  return false;
};

const FieldRestrictions: React.FC<FieldRestrictionProps> = ({ document }) => {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [processingRestriction, setProcessingRestriction] = useState<
    number | null
  >(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedArea, setSelectedArea] = useState<SelectionArea | null>(null);

  const [formData, setFormData] = useState<RestrictionFormData>({
    field: '',
    reason: '',
    userId: null,
    userRole: null,
    restrictedType: 'field',
    pageNumber: 1,
    coordinates: {
      xaxis: 0,
      yaxis: 0,
      width: 0,
      height: 0,
    },
  });

  const { fetchDocument } = useDocument();
  const { user } = useAuth();
  const [availableRoles, setAvailableRoles] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    if (document) {
      fetchRestrictions();
    }
  }, [document]);

useEffect(() => {
  const deptId = document?.document?.[0]?.DepartmentId;
  const subDeptId = document?.document?.[0]?.SubDepartmentId;

  if (!deptId || !subDeptId) {
    setAvailableRoles([]);
    return;
  }

  let isMounted = true;

  const loadRolesWithViewPermission = async () => {
    setRolesLoading(true);
    try {
      let roleAllocs = await fetchRoleAllocations(deptId, subDeptId);
      if (!roleAllocs || roleAllocs.length === 0) {
        roleAllocs = await fetchRoleAllocationsByLink(subDeptId);
      }
      const filteredRoles =
        roleAllocs
          ?.filter((alloc) => toBool(alloc.View))
          .map((alloc) => ({
            id: alloc.UserAccessID,
            name: alloc.userAccess?.Description || `Role ${alloc.UserAccessID}`,
          })) || [];
      if (isMounted) {
        setAvailableRoles(filteredRoles);
      }
    } catch (error) {
      console.error('Failed to load roles for document restrictions:', error);
      if (isMounted) {
        setAvailableRoles([]);
      }
    } finally {
      if (isMounted) {
        setRolesLoading(false);
      }
    }
  };

  loadRolesWithViewPermission();

  return () => {
    isMounted = false;
  };
}, [document]);

  // Update coordinates when area is selected
  useEffect(() => {
    if (selectedArea) {
      setFormData((prev) => ({
        ...prev,
        coordinates: {
          xaxis: selectedArea.x,
          yaxis: selectedArea.y,
          width: selectedArea.width,
          height: selectedArea.height,
        },
        pageNumber: selectedArea.pageNumber ?? 1,
        restrictedType: 'open',
      }));
    }
  }, [selectedArea]);

  // Update restriction type when field changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      restrictedType: prev.field === 'custom_area' ? 'open' : 'field',
    }));

    // Clear selection when switching from custom area to field
    if (formData.field !== 'custom_area' && selectedArea) {
      setSelectedArea(null);
    }
  }, [formData.field]);

  const fetchRestrictions = async () => {
    try {
      const response = await fetchDocumentRestrictions(
        String(document?.document[0].ID)
      );
      if (response.success && response.data) {
        const restrictionsWithNames = response.data.map((restriction) => {
          const rawType = (restriction.restrictedType || '').toString().toLowerCase();
          const normalizedType: 'open' | 'field' =
            rawType === 'open' || rawType === 'field'
              ? (rawType as 'open' | 'field')
              : (restriction.Field === 'Custom Area' ? 'open' : 'field');

        return {
            ...restriction,
            restrictedType: normalizedType,
            CollaboratorName:
              document?.collaborations?.find(
                (collab) => collab.CollaboratorID === restriction.UserID
              )?.CollaboratorName || 'Unknown User',
          };
        });
        
        // Filter restrictions to only show those for current collaborators
        const collaboratorIds = document?.collaborations?.map(c => c.CollaboratorID) || [];
        const filteredRestrictions = restrictionsWithNames.filter(restriction => 
          collaboratorIds.includes(Number(restriction.UserID)) || collaboratorIds.includes(restriction.UserID)
        );
        
        console.log('All restrictions:', restrictionsWithNames.length);
        console.log('Filtered restrictions:', filteredRestrictions.length);
        console.log('Collaborator IDs (numbers):', collaboratorIds);
        console.log('Restriction UserIDs (strings):', restrictionsWithNames.map(r => r.UserID));
        console.log('Data type check:', {
          collaboratorIds: collaboratorIds.map(id => typeof id),
          restrictionUserIDs: restrictionsWithNames.map(r => typeof r.UserID)
        });
        
        // If no restrictions match collaborators, show all restrictions (fallback)
        if (filteredRestrictions.length === 0 && restrictionsWithNames.length > 0) {
          console.warn('No restrictions match current collaborators, showing all restrictions');
          setRestrictions(restrictionsWithNames);
        } else {
          setRestrictions(filteredRestrictions);
        }
      }
    } catch (error) {
      console.error('Failed to fetch restrictions:', error);
      showMessage('Failed to load restrictions. Please try again.', true);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (message: string, isError: boolean = false) => {
    if (isError) {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleAreaSelect = (area: SelectionArea) => {
    setSelectedArea(area);
  };

  const handleClearSelection = () => {
    setSelectedArea(null);
    setFormData((prev) => ({
      ...prev,
      coordinates: { xaxis: 0, yaxis: 0, width: 0, height: 0 },
      pageNumber: 1,
    }));
  };

  const handleAddRestriction = async () => {
    if (!document || !formData.field) return;

    if (!formData.userRole) {
      showMessage('Please select a role to restrict.', true);
      return;
    }

    if (!formData.reason.trim()) {
      showMessage('Please provide a reason for the restriction.', true);
      return;
    }

    if (formData.field === 'custom_area' && !selectedArea) {
      showMessage('Please select an area on the document preview.', true);
      return;
    }

    setProcessingRestriction(-1);
    try {
      const payload = {
        Field:
          formData.field === 'custom_area' ? 'Custom Area' : formData.field,
        Reason: formData.reason.trim(),
        UserID: formData.userId ?? formData.userRole,
        UserRole: formData.userRole,
        restrictedType: formData.restrictedType,
        xaxis: formData.coordinates.xaxis,
        yaxis: formData.coordinates.yaxis,
        width: formData.coordinates.width,
        height: formData.coordinates.height,
        pageNumber: formData.pageNumber ?? 1,
      };

      const response = await restrictFields(
        String(document.document[0].ID),
        payload
      );

      if (response.success) {
        // Log restriction addition activity (optional - silent fail)
        try {
          await logSecurityActivity(
            'RESTRICTION_ADDED',
            user!.ID,
            user!.UserName,
            document.document[0].ID,
            document.document[0].FileName,
            formData.field === 'custom_area' ? 'custom_area' : formData.field,
            formData.reason
          );
        } catch (logError) {
          // Activity logging is optional, fail silently
          // console.warn('Activity logging failed (optional):', logError);
        }

        const action =
          formData.field === 'custom_area'
            ? 'Custom area restriction'
            : `Field "${formData.field}" restriction`;
        showMessage(`${action} added successfully!`);
        try {
          const toastModule = await import('react-hot-toast');
          toastModule.default.success('Restriction added successfully');
        } catch {}
        
        console.log('Restriction added successfully:', {
          field: formData.field,
          userId: formData.userId,
          reason: formData.reason
        });

        // Reset form
        setFormData({
          field: '',
          reason: '',
          userId: null,
          userRole: null,
          restrictedType: 'field',
          pageNumber: 1,
          coordinates: { xaxis: 0, yaxis: 0, width: 0, height: 0 },
        });
        setSelectedArea(null);

        await fetchRestrictions();
        await fetchDocument(String(document.document[0].ID));
      } else {
        showMessage(response.message || 'Failed to add restriction', true);
      }
    } catch (error: any) {
      console.error('Failed to add restriction:', error);
      showMessage('Failed to add restriction. Please try again.', true);
    } finally {
      setProcessingRestriction(null);
    }
  };

  const handleRemoveRestriction = async (restrictionId: number) => {
    if (!document) return;

    setProcessingRestriction(restrictionId);
    try {
      const response = await removeRestrictedFields(
        String(document.document[0].ID),
        String(restrictionId)
      );

      if (response.success) {
        showMessage('Restriction removed successfully!');
        await fetchRestrictions();
        await fetchDocument(String(document.document[0].ID));
      } else {
        showMessage(response.message || 'Failed to remove restriction', true);
      }
    } catch (error: any) {
      console.error('Failed to remove restriction:', error);
      showMessage('Failed to remove restriction. Please try again.', true);
    } finally {
      setProcessingRestriction(null);
    }
  };

  const handleFormChange = (updates: Partial<RestrictionFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  if (!document) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Prepare existing restrictions for display on the preview
  const existingRestrictionsForPreview = restrictions
    .filter((restriction) => restriction.restrictedType === 'open')
    .map((restriction) => ({
      id: restriction.ID,
      field: restriction.Field,
      xaxis: restriction.xaxis,
      yaxis: restriction.yaxis,
      width: restriction.width,
      height: restriction.height,
      restrictedType: restriction.restrictedType,
      pageNumber: restriction.pageNumber ?? 1,
    }));

  const fieldRestrictions = restrictions.filter(
    (r) => r.restrictedType === 'field'
  );
  const customAreaRestrictions = restrictions.filter(
    (r) => r.restrictedType === 'open'
  );
  
  // Calculate unique collaborators with restrictions
  const collaboratorsWithRestrictions = new Set(
    restrictions.map(r => r.UserID)
  ).size;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Document Masking
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage field and area restrictions for collaborators
              </p>
            </div>
            <div className="bg-white backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-black"> 
                <Shield className="h-5 w-5" />
                <span className="font-semibold">{restrictions.length}</span>
                <span className="text-sm">
                  {restrictions.length === 0 ? 'No masks' : 'Active'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {restrictions.length === 0 
                  ? 'No information are hidden'
                  : `${collaboratorsWithRestrictions} collaborator${collaboratorsWithRestrictions !== 1 ? 's' : ''} restricted`
                }
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 rounded-full p-2">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total Masking
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {restrictions.length}
                  </p>                  
                  <p className="text-xs text-blue-500 mt-1">
                    Restriction amount
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-full p-2">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Field Masking
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {fieldRestrictions.length}
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    Masked fields
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 rounded-full p-2">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-orange-600 font-medium">
                    Custom Masking
                  </p>
                  <p className="text-2xl font-bold text-orange-900">
                    {customAreaRestrictions.length}
                  </p>
                  <p className="text-xs text-orange-500 mt-1">
                    Drawn areas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 shadow-sm">
          <CheckCircle size={20} className="text-green-600" />
          <span className="text-sm font-medium text-green-700">
            {successMessage}
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 shadow-sm">
          <AlertTriangle size={20} className="text-red-600" />
          <span className="text-sm font-medium text-red-700">
            {errorMessage}
          </span>
        </div>
      )}

      {/* Restriction Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <RestrictionForm
          formData={formData}
          onFormChange={handleFormChange}
          onSubmit={handleAddRestriction}
          isSubmitting={processingRestriction === -1}
          document={document}
          selectedArea={selectedArea}
          onClearSelection={handleClearSelection}
          availableRoles={availableRoles}
          rolesLoading={rolesLoading}
        />

        {/* Document Preview - Only show when custom area is selected */}
        {formData.field === 'custom_area' && (
          <div className="border-t border-gray-200">
            <DocumentPreview
              document={document}
              onAreaSelect={handleAreaSelect}
              selectedArea={selectedArea}
              existingRestrictions={existingRestrictionsForPreview}
            />
          </div>
        )}
      </div>

      {/* Restrictions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <RestrictionList
          restrictions={restrictions}
          expandedUser={expandedUser}
          setExpandedUser={setExpandedUser}
          onRemoveRestriction={handleRemoveRestriction}
          processingRestriction={processingRestriction}
          document={document}
          availableRoles={availableRoles}
        />

        {/* Empty State */}
        {restrictions.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No restrictions found</p>
            <p className="text-sm text-gray-400 mt-1">
              {document?.collaborations?.length === 0 
                ? 'Add collaborators to the document to create restrictions'
                : 'Create your first restriction to control document access'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldRestrictions;
