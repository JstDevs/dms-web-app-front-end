import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Plus, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocumentTypeSelection } from './useDepartmentSelection';
import { useUsers } from '@/pages/Users/useUser';
import {
  fetchApprovalMatrix,
  createApprovalMatrix,
  updateApprovalMatrix,
  ApprovalMatrixRecord,
  ApprovalRule,
} from '@/api/approvalMatrix';
import {
  listDocumentApprovers,
  createDocumentApprover,
  updateDocumentApprover,
  deleteDocumentApprover,
  DocumentApproverRecord,
} from '@/api/documentApprovers';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { MODULE_IDS } from '@/constants/moduleIds';

type LevelApprover = {
  id?: number;
  approverId: string;
};

type LevelState = {
  sequenceLevel: number;
  approvers: LevelApprover[];
};

const createEmptyLevel = (sequenceLevel: number): LevelState => ({
  sequenceLevel,
  approvers: [],
});

const groupApproversByLevel = (
  records: DocumentApproverRecord[]
): LevelState[] => {
  if (!records.length) {
    return [createEmptyLevel(1)];
  }

  const grouped = records
    .filter((record) => record.Active !== false)
    .reduce((acc, record) => {
      if (!acc[record.SequenceLevel]) {
        acc[record.SequenceLevel] = [];
      }
      acc[record.SequenceLevel].push({
        id: record.ID,
        approverId: String(record.ApproverID),
      });
      return acc;
    }, {} as Record<number, LevelApprover[]>);

  const sortedLevels = Object.keys(grouped)
    .map((key) => Number(key))
    .sort((a, b) => a - b);

  return sortedLevels.length
    ? sortedLevels.map((sequenceLevel, index) => ({
        sequenceLevel: index + 1,
        approvers: grouped[sequenceLevel],
      }))
    : [createEmptyLevel(1)];
};

const ApprovalMatrix = () => {
  const {
    selectedDepartmentId,
    setSelectedDepartmentId,
    selectedDepartmentLabel,
    selectedDocumentTypeId,
    setSelectedDocumentTypeId,
    selectedDocumentTypeLabel,
    departmentOptions,
    documentTypeOptions,
    loadingDepartments,
    resetSelection,
  } = useDocumentTypeSelection();

  const { users, loading: loadingUsers } = useUsers();
  const [approvalRule, setApprovalRule] = useState<ApprovalRule>('ALL');
  const [levels, setLevels] = useState<LevelState[]>([createEmptyLevel(1)]);
  const [existingMatrix, setExistingMatrix] =
    useState<ApprovalMatrixRecord | null>(null);
  const [existingApprovers, setExistingApprovers] = useState<
    DocumentApproverRecord[]
  >([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);
  const approvalMatrixPermissions = useModulePermissions(
    MODULE_IDS.approvalMatrix
  );
  const canAdd = Boolean(approvalMatrixPermissions?.Add);
  const canEdit = Boolean(approvalMatrixPermissions?.Edit);
  const canDelete = Boolean(approvalMatrixPermissions?.Delete);

  const ensureAddPermission = () => {
    if (canAdd) return true;
    toast.error('You do not have permission to add approval entries.');
    return false;
  };

  const ensureEditPermission = () => {
    if (canEdit) return true;
    toast.error('You do not have permission to edit the approval matrix.');
    return false;
  };

  const ensureDeletePermission = () => {
    if (canDelete) return true;
    toast.error('You do not have permission to delete approval entries.');
    return false;
  };

  const handleApprovalRuleChange = (value: ApprovalRule) => {
    if (existingMatrix) {
      if (!ensureEditPermission()) return;
    } else if (!ensureAddPermission()) {
      return;
    }
    setApprovalRule(value);
  };

  const canConfigure = Boolean(
    selectedDepartmentId && selectedDocumentTypeId
  );

  const resetForm = useCallback(() => {
    setApprovalRule('ALL');
    setLevels([createEmptyLevel(1)]);
    setExistingMatrix(null);
    setExistingApprovers([]);
  }, []);

  const userOptions = useMemo(() => {
    const base = users.map((user) => ({
      value: String(user.ID),
      label: user.UserName,
    }));

    const existingIds = new Set(base.map((option) => option.value));

    existingApprovers.forEach((record) => {
      const value = String(record.ApproverID);
      if (!existingIds.has(value)) {
        base.push({
          value,
          label: record.ApproverName ?? `User ${value}`,
        });
        existingIds.add(value);
      }
    });

    return base.sort((a, b) => a.label.localeCompare(b.label));
  }, [users, existingApprovers]);

  const loadConfiguration = useCallback(async () => {
    if (!selectedDepartmentId || !selectedDocumentTypeId) {
      return;
    }

    setLoadingMatrix(true);
    try {
      const [matrixResponse, approversResponse] = await Promise.all([
        fetchApprovalMatrix({
          DepartmentId: selectedDepartmentId,
          SubDepartmentId: selectedDocumentTypeId,
        }),
        listDocumentApprovers({
          DepartmentId: selectedDepartmentId,
          SubDepartmentId: selectedDocumentTypeId,
        }),
      ]);

      const matrixRecord =
        matrixResponse?.approvalMatrix ?? null;
      setExistingMatrix(matrixRecord);
      setApprovalRule(matrixRecord?.AllorMajority ?? 'ALL');

      const approverRecords = approversResponse?.approvers ?? [];
      setExistingApprovers(approverRecords);
      setLevels(groupApproversByLevel(approverRecords));
    } catch (error) {
      console.error('Error loading approval matrix:', error);
      toast.error('Failed to load approval matrix');
      resetForm();
    } finally {
      setLoadingMatrix(false);
    }
  }, [
    resetForm,
    selectedDepartmentId,
    selectedDocumentTypeId,
  ]);

  useEffect(() => {
    if (canConfigure) {
      loadConfiguration();
    } else {
      resetForm();
    }
  }, [canConfigure, loadConfiguration, resetForm]);

  const addLevel = () => {
    if (!ensureAddPermission()) return;
    setLevels((prev) => [
      ...prev,
      createEmptyLevel(prev.length + 1),
    ]);
  };

  const removeLevel = (sequenceLevel: number) => {
    if (!ensureDeletePermission()) return;
    if (levels.length === 1) {
      toast.error('At least one level is required');
      return;
    }

    setLevels((prev) => {
      const filtered = prev.filter(
        (level) => level.sequenceLevel !== sequenceLevel
      );
      return filtered.length
        ? filtered
            .sort((a, b) => a.sequenceLevel - b.sequenceLevel)
            .map((level, index) => ({
              ...level,
              sequenceLevel: index + 1,
            }))
        : [createEmptyLevel(1)];
    });
  };

  const addApproverToLevel = (levelIndex: number) => {
    if (!ensureAddPermission()) return;
    setLevels((prev) =>
      prev.map((level, index) =>
        index === levelIndex
          ? {
              ...level,
              approvers: [
                ...level.approvers,
                { approverId: '' },
              ],
            }
          : level
      )
    );
  };

  const updateApproverSelection = (
    levelIndex: number,
    approverIndex: number,
    value: string
  ) => {
    const targetLevel = levels[levelIndex];
    const targetApprover = targetLevel?.approvers?.[approverIndex];
    const isExistingApprover = Boolean(targetApprover?.id);

    if (isExistingApprover) {
      if (!ensureEditPermission()) return;
    } else if (!ensureAddPermission()) {
      return;
    }

    setLevels((prev) =>
      prev.map((level, index) => {
        if (index !== levelIndex) return level;
        const updatedApprovers = level.approvers.map(
          (approver, idx) =>
            idx === approverIndex
              ? { ...approver, approverId: value }
              : approver
        );
        return {
          ...level,
          approvers: updatedApprovers,
        };
      })
    );
  };

  const removeApproverFromLevel = (
    levelIndex: number,
    approverIndex: number
  ) => {
    if (!ensureDeletePermission()) return;
    setLevels((prev) =>
      prev.map((level, index) => {
        if (index !== levelIndex) return level;
        const filteredApprovers = level.approvers.filter(
          (_, idx) => idx !== approverIndex
        );
        return {
          ...level,
          approvers: filteredApprovers,
        };
      })
    );
  };

  const validateConfiguration = () => {
    if (!selectedDepartmentId || !selectedDocumentTypeId) {
      toast.error('Please select department and document type');
      return false;
    }

    if (!levels.length) {
      toast.error('At least one approval level is required');
      return false;
    }

    for (const level of levels) {
      if (!level.approvers.length) {
        toast.error(
          `Level ${level.sequenceLevel} must have at least one approver`
        );
        return false;
      }

      const seen = new Set<string>();
      for (const approver of level.approvers) {
        if (!approver.approverId) {
          toast.error(
            `Please select an approver for level ${level.sequenceLevel}`
          );
          return false;
        }

        if (seen.has(approver.approverId)) {
          toast.error(
            `Duplicate approver in level ${level.sequenceLevel}`
          );
          return false;
        }

        seen.add(approver.approverId);
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateConfiguration()) return;

    const departmentId = parseInt(String(selectedDepartmentId), 10);
    const subDepartmentId = parseInt(String(selectedDocumentTypeId), 10);

    if (Number.isNaN(departmentId) || Number.isNaN(subDepartmentId)) {
      toast.error('Invalid department or document type selection');
      return;
    }

    if (departmentId <= 0 || subDepartmentId <= 0) {
      toast.error('Department and document type must be valid selections');
      return;
    }

    if (!approvalRule || (approvalRule !== 'ALL' && approvalRule !== 'MAJORITY')) {
      toast.error('Invalid approval rule selected');
      return;
    }

    const matrixPayload = {
      DepartmentId: departmentId,
      SubDepartmentId: subDepartmentId,
      AllorMajority: approvalRule,
    } as const;

    const flattenedApprovers = levels.flatMap((level) =>
      level.approvers.map((approver) => ({
        id: approver.id,
        ApproverID: Number(approver.approverId),
        SequenceLevel: level.sequenceLevel,
      }))
    );

    if (
      flattenedApprovers.some(
        (item) => Number.isNaN(item.ApproverID) || item.ApproverID <= 0
      )
    ) {
      toast.error('Invalid approver selection detected');
      return;
    }

    const existingById = new Map(
      existingApprovers.map((record) => [record.ID, record])
    );

    const toDelete = existingApprovers
      .filter(
        (record) =>
          !flattenedApprovers.some(
            (approver) => approver.id === record.ID
          )
      )
      .map((record) => record.ID);

    const toCreate = flattenedApprovers.filter((approver) => !approver.id);

    const toUpdate = flattenedApprovers.filter((approver) => {
      if (!approver.id) return false;
      const existing = existingById.get(approver.id);
      if (!existing) return false;
      return (
        existing.ApproverID !== approver.ApproverID ||
        existing.SequenceLevel !== approver.SequenceLevel ||
        existing.Active === false
      );
    });

    if (toDelete.length > 0 && !canDelete) {
      toast.error('You do not have permission to delete approval entries.');
      return;
    }

    const requiresAddPermission = !existingMatrix || toCreate.length > 0;
    const requiresEditPermission =
      Boolean(existingMatrix) || toUpdate.length > 0 || toDelete.length > 0;

    if (requiresAddPermission && !ensureAddPermission()) return;
    if (requiresEditPermission && !ensureEditPermission()) return;

    setSaving(true);
    try {
      // ALWAYS fetch first to get the latest state - this ensures we know if matrix exists
      let currentMatrix: ApprovalMatrixRecord | null = null;
      try {
        const matrixResponse = await fetchApprovalMatrix({
          DepartmentId: departmentId,
          SubDepartmentId: subDepartmentId,
        });
        currentMatrix = matrixResponse?.approvalMatrix ?? null;
        if (currentMatrix) {
          setExistingMatrix(currentMatrix);
        }
      } catch (fetchError: any) {
        // If fetch fails (404 or other), assume no matrix exists yet
        // 404 is expected when no matrix exists, so we'll try to create
        currentMatrix = null;
      }
      
      // Now decide: update if exists, create if not
      if (currentMatrix?.ID) {
        // Only update if values actually changed
        const needsUpdate = 
          currentMatrix.AllorMajority !== matrixPayload.AllorMajority ||
          currentMatrix.DepartmentId !== matrixPayload.DepartmentId ||
          currentMatrix.SubDepartmentId !== matrixPayload.SubDepartmentId;
        
        if (needsUpdate) {
          try {
            await updateApprovalMatrix(currentMatrix.ID, matrixPayload);
          } catch (updateError: any) {
            // If update endpoint doesn't exist (404), just continue silently
            // The matrix already exists, so we can proceed with approver updates
            if (updateError?.response?.status !== 404) {
              // Only throw if it's not a 404
              throw updateError;
            }
          }
        }
      } else {
        try {
          const { approvalMatrix } = await createApprovalMatrix(
            matrixPayload
          );
          setExistingMatrix(approvalMatrix ?? null);
        } catch (createError: any) {
          // If create fails with "already exists" error, fetch and update instead
          const errorMessage = createError?.response?.data?.message || '';
          const errorData = createError?.response?.data?.data;
          const fullErrorData = createError?.response?.data;
          
          if (
            errorMessage.includes('already exists') ||
            errorMessage.includes('Already exists') ||
            (createError?.response?.status === 400 && errorMessage)
          ) {
            // This is expected - matrix already exists, we'll handle it gracefully
            // Try to get the matrix ID from error response data, or fetch it
            let matrixToUpdate: ApprovalMatrixRecord | null = null;
            
            // Check if matrix info is in the error response
            if (errorData?.ID) {
              matrixToUpdate = errorData as ApprovalMatrixRecord;
            } else if (errorData?.approvalMatrix?.ID) {
              matrixToUpdate = errorData.approvalMatrix;
            } else if (fullErrorData?.ID) {
              matrixToUpdate = fullErrorData as ApprovalMatrixRecord;
            }
            
            // If not in error response, fetch it
            if (!matrixToUpdate?.ID) {
              try {
                const matrixResponse = await fetchApprovalMatrix({
                  DepartmentId: departmentId,
                  SubDepartmentId: subDepartmentId,
                });
                matrixToUpdate = matrixResponse?.approvalMatrix ?? null;
              } catch (fetchError: any) {
                // Last resort: check if error response has any ID we can use
                if (fullErrorData && typeof fullErrorData === 'object') {
                  const anyData = fullErrorData as any;
                  if (anyData.ID && anyData.DepartmentId && anyData.SubDepartmentId) {
                    matrixToUpdate = anyData as ApprovalMatrixRecord;
                  }
                }
              }
            }
            
            if (matrixToUpdate?.ID) {
              // Check if matrix values actually changed
              const needsUpdate = 
                matrixToUpdate.AllorMajority !== matrixPayload.AllorMajority ||
                matrixToUpdate.DepartmentId !== matrixPayload.DepartmentId ||
                matrixToUpdate.SubDepartmentId !== matrixPayload.SubDepartmentId;
              
              if (needsUpdate) {
                try {
                  await updateApprovalMatrix(matrixToUpdate.ID, matrixPayload);
                } catch (updateError: any) {
                  // If update endpoint doesn't exist (404), just continue silently
                  // The matrix already exists, so we can proceed with approver updates
                  if (updateError?.response?.status !== 404) {
                    // Only throw if it's not a 404
                    throw updateError;
                  }
                }
              }
              setExistingMatrix(matrixToUpdate);
            } else {
              // If we can't find the matrix, just continue - it exists on the server
              // The approver updates will still work
              console.warn('Could not retrieve matrix details, but continuing with approver updates...');
            }
          } else {
            throw createError; // Re-throw other errors
          }
        }
      }

      await Promise.all(
        toDelete.map((id) => deleteDocumentApprover(id))
      );

      await Promise.all(
        toUpdate.map((approver) =>
          updateDocumentApprover(approver.id!, {
            ApproverID: approver.ApproverID,
            SequenceLevel: approver.SequenceLevel,
            Active: true,
          })
        )
      );

      await Promise.all(
        toCreate.map((approver) =>
          createDocumentApprover({
            DepartmentId: departmentId,
            SubDepartmentId: subDepartmentId,
            ApproverID: approver.ApproverID,
            SequenceLevel: approver.SequenceLevel,
            Active: true,
          })
        )
      );

      await loadConfiguration();
      toast.success('Approval matrix saved successfully');
    } catch (error: any) {
      console.error('Error saving approval matrix:', error);
      
      // Log the actual error response from the server
      if (error?.response?.data) {
        console.error('Server error response:', error.response.data);
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Failed to save approval matrix';
        toast.error(errorMessage);
      } else if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save approval matrix');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClearSelection = () => {
    resetSelection();
    resetForm();
  };

  if (loadingDepartments || loadingUsers || loadingMatrix) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 font-medium">Loading approval matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg min-h-full flex-1 overflow-hidden">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Save className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Approval Matrix</h1>
        </div>
        <p className="text-blue-100 text-sm sm:text-base mt-1">
          Configure approval rules and approver levels per department and document type
        </p>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Document Selection Card */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm p-6 transition-all duration-200 hover:shadow-md">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                {/* <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ChevronDown className="h-5 w-5 text-blue-600" />
                </div> */}
                <h1 className="text-lg font-bold text-gray-800">
                  Document Selection
                </h1>
              </div>
              {(selectedDepartmentId || selectedDocumentTypeId) && (
                <button
                  onClick={handleClearSelection}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Department <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 pr-10 appearance-none bg-white text-gray-900 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 cursor-pointer"
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Document Type (Sub-Department){' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <select
                    value={selectedDocumentTypeId}
                    onChange={(e) => setSelectedDocumentTypeId(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 pr-10 appearance-none bg-white text-gray-900 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                    disabled={!selectedDepartmentId}
                  >
                    <option value="">
                      {documentTypeOptions.length === 0
                        ? 'No document types available'
                        : 'Select Document Type'}
                    </option>
                    {documentTypeOptions.map((docType: any) => (
                      <option key={docType.value} value={docType.value}>
                        {docType.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
            </div>

            {existingMatrix && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  </div>
                  <p className="text-sm text-blue-800 font-medium">
                    Existing approval matrix found for{' '}
                    <strong className="font-semibold">{selectedDepartmentLabel}</strong> /{' '}
                    <strong className="font-semibold">{selectedDocumentTypeLabel}</strong>. 
                    Saving will update the current configuration.
                  </p>
                </div>
              </div>
            )}
          </div>

          {canConfigure ? (
            <>
              {/* Approval Rule Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Approval Rule <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-8 space-y-4 sm:space-y-0">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="radio"
                        value="ALL"
                        checked={approvalRule === 'ALL'}
                        onChange={(e) =>
                          handleApprovalRuleChange(e.target.value as ApprovalRule)
                        }
                        disabled={existingMatrix ? !canEdit : !canAdd}
                        className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400"
                      />
                    </div>
                    <div>
                      <span className="text-gray-900 font-medium group-hover:text-blue-600 transition-colors">
                        ALL
                      </span>
                      <span className="text-gray-600 text-sm ml-2">
                        — every level must end in approval
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="radio"
                        value="MAJORITY"
                        checked={approvalRule === 'MAJORITY'}
                        onChange={(e) =>
                          handleApprovalRuleChange(e.target.value as ApprovalRule)
                        }
                        disabled={existingMatrix ? !canEdit : !canAdd}
                        className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:text-gray-400"
                      />
                    </div>
                    <div>
                      <span className="text-gray-900 font-medium group-hover:text-blue-600 transition-colors">
                        MAJORITY
                      </span>
                      <span className="text-gray-600 text-sm ml-2">
                        — compare approved vs rejected levels (ties reject)
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Approver Levels Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Approver Levels
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure sequential approval levels with multiple approvers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addLevel}
                    disabled={!canAdd}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Level</span>
                  </button>
                </div>

                {levels.map((level, levelIndex) => (
                  <div
                    key={level.sequenceLevel}
                    className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 space-y-5 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                      <div className="flex items-start space-x-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-lg">
                            {level.sequenceLevel}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-1">
                            Level {level.sequenceLevel}
                          </h4>
                          <p className="text-sm text-gray-600 max-w-md">
                            First response decides the level outcome. Remaining
                            requests are cancelled automatically.
                          </p>
                        </div>
                      </div>
                      {levels.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLevel(level.sequenceLevel)}
                          disabled={!canDelete}
                          className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {level.approvers.map((approver, approverIndex) => (
                        <div
                          key={approver.id ?? `${level.sequenceLevel}-${approverIndex}`}
                          className="flex flex-col sm:flex-row sm:items-end sm:space-x-3 space-y-3 sm:space-y-0 bg-white rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Approver <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                              <select
                                value={approver.approverId}
                                onChange={(e) =>
                                  updateApproverSelection(
                                    levelIndex,
                                    approverIndex,
                                    e.target.value
                                  )
                                }
                                disabled={!(canAdd || canEdit)}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 pr-10 appearance-none bg-white text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 cursor-pointer disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                              >
                                <option value="">Select User</option>
                                {userOptions.map((user) => (
                                  <option key={user.value} value={user.value}>
                                    {user.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeApproverFromLevel(levelIndex, approverIndex)
                            }
                            disabled={!canDelete}
                            className="flex items-center justify-center px-4 py-2.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addApproverToLevel(levelIndex)}
                        disabled={!canAdd}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium border-2 border-dashed border-blue-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Plus className="h-5 w-5" />
                        <span>Add Approver</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-200 bg-gray-50 -mx-6 sm:-mx-8 px-6 sm:px-8 py-6">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-medium transition-all duration-200"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                  disabled={saving || (!canAdd && !canEdit)}
                >
                  <Save className="h-5 w-5" />
                  <span>{saving ? 'Saving...' : 'Save Approval Matrix'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-12 border-2 border-dashed border-gray-300 max-w-2xl mx-auto">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                  <ChevronDown className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg font-medium">
                  Please select a department and document type to configure
                  the approval matrix.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalMatrix;
