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
    setLevels((prev) => [
      ...prev,
      createEmptyLevel(prev.length + 1),
    ]);
  };

  const removeLevel = (sequenceLevel: number) => {
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

    const departmentId = Number(selectedDepartmentId);
    const subDepartmentId = Number(selectedDocumentTypeId);

    if (Number.isNaN(departmentId) || Number.isNaN(subDepartmentId)) {
      toast.error('Invalid department or document type selection');
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

    setSaving(true);
    try {
      if (existingMatrix?.ID) {
        await updateApprovalMatrix(existingMatrix.ID, matrixPayload);
      } else {
        const { approvalMatrix } = await createApprovalMatrix(
          matrixPayload
        );
        setExistingMatrix(approvalMatrix ?? null);
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
    } catch (error) {
      console.error('Error saving approval matrix:', error);
      toast.error('Failed to save approval matrix');
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
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg min-h-full flex-1">
      <header className="text-left flex-1 py-4 sm:px-6 px-3">
        <h1 className="text-3xl font-bold text-blue-800">Approval Matrix</h1>
        <p className="text-gray-600 mt-2">
          Configure approval rules and approver levels per department and
          document type.
        </p>
      </header>

      <div className="p-6 space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Document Selection
            </h3>
            {(selectedDepartmentId || selectedDocumentTypeId) && (
              <button
                onClick={handleClearSelection}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type (Sub-Department){' '}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDocumentTypeId}
                  onChange={(e) => setSelectedDocumentTypeId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {existingMatrix && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                Existing approval matrix found for{' '}
                <strong>{selectedDepartmentLabel}</strong> /{' '}
                <strong>{selectedDocumentTypeLabel}</strong>. Saving will
                update the current configuration.
              </p>
            </div>
          )}
        </div>

        {canConfigure ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Approval Rule <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-3 sm:space-y-0">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="ALL"
                    checked={approvalRule === 'ALL'}
                    onChange={(e) =>
                      setApprovalRule(e.target.value as ApprovalRule)
                    }
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span>ALL — every level must end in approval</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="MAJORITY"
                    checked={approvalRule === 'MAJORITY'}
                    onChange={(e) =>
                      setApprovalRule(e.target.value as ApprovalRule)
                    }
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span>
                    MAJORITY — compare approved vs rejected levels (ties reject)
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Approver Levels
                </h3>
                <button
                  type="button"
                  onClick={addLevel}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Level</span>
                </button>
              </div>

              {levels.map((level, levelIndex) => (
                <div
                  key={level.sequenceLevel}
                  className="border border-gray-200 rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-semibold text-gray-800">
                        Level {level.sequenceLevel}
                      </h4>
                      <p className="text-sm text-gray-500">
                        First response decides the level outcome. Remaining
                        requests are cancelled automatically.
                      </p>
                    </div>
                    {levels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLevel(level.sequenceLevel)}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Remove Level</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {level.approvers.map((approver, approverIndex) => (
                      <div
                        key={approver.id ?? `${level.sequenceLevel}-${approverIndex}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0"
                      >
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Approver <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={approver.approverId}
                            onChange={(e) =>
                              updateApproverSelection(
                                levelIndex,
                                approverIndex,
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select User</option>
                            {userOptions.map((user) => (
                              <option key={user.value} value={user.value}>
                                {user.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            removeApproverFromLevel(levelIndex, approverIndex)
                          }
                          className="flex items-center justify-center text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addApproverToLevel(levelIndex)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Approver</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Approval Matrix'}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-lg p-8">
              <p className="text-gray-500 text-lg">
                Please select a department and document type to configure
                the approval matrix.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalMatrix;
