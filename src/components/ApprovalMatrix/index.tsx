// components/ApprovalMatrix.js
import { useState, useEffect } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, Plus, Trash2, Save, X } from 'lucide-react';
// import { useDocumentTypeSelection } from '@/hooks/useDocumentTypeSelection';
// import { fetchPositions } from '@/features/settings/positionSlice';
// import { fetchEmployees } from '@/features/settings/employeeSlice';
import toast from 'react-hot-toast';
import { useDocumentTypeSelection } from './useDepartmentSelection';

const sequenceLevels = [
  { value: '1', label: '1 - First' },
  { value: '2', label: '2 - Second' },
  { value: '3', label: '3 - Third' },
];
const positions = [
  { Name: 'Position', id: 1 },
  { Name: 'Sub - Position', id: 2 },
  { Name: 'Sub - Sub - Position', id: 3 },
];
const employees = [
  { FirstName: 'Employee', LastName: 'Name', id: 1 },
  { FirstName: 'Employee 2 ', LastName: 'Name 2', id: 2 },
  { FirstName: 'Employee 3 ', LastName: 'Name 3', id: 3 },
];
const ApprovalMatrix = () => {
  //   const dispatch = useDispatch();
  const {
    selectedDepartment,
    setSelectedDepartment,
    selectedDocumentType,
    setSelectedDocumentType,
    departmentOptions,
    documentTypeOptions,
    loadingDepartments,
  } = useDocumentTypeSelection();

  // Redux state
  //   const { positions } = useSelector((state) => state.positions);
  //   const { employees } = useSelector((state) => state.employees);

  // Local state
  const [approvalRule, setApprovalRule] = useState('ALL');
  const [numberOfApprovers, setNumberOfApprovers] = useState('');
  const [sequenceLevel, setSequenceLevel] = useState('');
  const [approvers, setApprovers] = useState([
    { type: 'Position', value: '', amountFrom: '', amountTo: '' },
  ]);

  // Load existing approval matrix when department/document type is selected
  const [existingMatrix, setExistingMatrix] = useState(null);

  //   useEffect(() => {
  //     dispatch(fetchPositions());
  //     dispatch(fetchEmployees());
  //   }, [dispatch]);

  // Load approval matrix when department and document type are selected
  useEffect(() => {
    if (selectedDepartment && selectedDocumentType) {
      loadApprovalMatrix();
    } else {
      setExistingMatrix(null);
      resetForm();
    }
  }, [selectedDepartment, selectedDocumentType]);

  const loadApprovalMatrix = async () => {
    try {
      // Simulate API call to load existing approval matrix
      // const response = await fetchApprovalMatrix(selectedDepartment, selectedDocumentType);
      // setExistingMatrix(response.data);

      // For now, simulate empty matrix
      setExistingMatrix(null);
      resetForm();
    } catch (error) {
      console.error('Error loading approval matrix:', error);
      toast.error('Failed to load approval matrix');
    }
  };

  const resetForm = () => {
    setApprovalRule('ALL');
    setNumberOfApprovers('');
    setSequenceLevel('');
    setApprovers([
      { type: 'Position', value: '', amountFrom: '', amountTo: '' },
    ]);
  };

  // Add new approver
  const addApprover = () => {
    setApprovers([
      ...approvers,
      { type: 'Position', value: '', amountFrom: '', amountTo: '' },
    ]);
  };

  // Remove approver
  const removeApprover = (index: number) => {
    if (approvers.length > 1) {
      const updated = [...approvers];
      updated.splice(index, 1);
      setApprovers(updated);
    }
  };

  // Update approver field
  const updateApprover = (index: number, field: string, value: string) => {
    const updated = [...approvers];
    updated[index] = { ...updated[index], [field]: value };
    setApprovers(updated);
  };

  // Validate form
  const validateForm = () => {
    if (!selectedDepartment || !selectedDocumentType) {
      toast.error('Please select department and document type');
      return false;
    }
    if (!sequenceLevel) {
      toast.error('Please select sequence level');
      return false;
    }
    if (approvalRule === 'Majority' && !numberOfApprovers) {
      toast.error('Please specify number of approvers for majority rule');
      return false;
    }
    if (
      approvers.some(
        (approver) =>
          !approver.value || !approver.amountFrom || !approver.amountTo
      )
    ) {
      toast.error('Please fill all required fields for approvers');
      return false;
    }

    // Validate amount ranges
    for (let i = 0; i < approvers.length; i++) {
      const approver = approvers[i];
      const amountFrom = parseFloat(approver.amountFrom);
      const amountTo = parseFloat(approver.amountTo);

      if (amountFrom >= amountTo) {
        toast.error(
          `Approver ${i + 1}: Amount From must be less than Amount To`
        );
        return false;
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      department: selectedDepartment,
      documentType: selectedDocumentType,
      sequenceLevel,
      approvalRule,
      numberOfApprovers: approvalRule === 'Majority' ? numberOfApprovers : null,
      approvers: approvers.map((approver) => ({
        type: approver.type,
        value: approver.value,
        amountFrom: parseFloat(approver.amountFrom),
        amountTo: parseFloat(approver.amountTo),
      })),
    };

    try {
      // Simulate API call
      // await saveApprovalMatrix(payload);
      console.log('Submission payload:', payload);
      toast.success('Approval matrix saved successfully!');
    } catch (error) {
      console.error('Error saving approval matrix:', error);
      toast.error('Failed to save approval matrix');
    }
  };

  const clearSelection = () => {
    setSelectedDepartment('');
    setSelectedDocumentType('');
    setExistingMatrix(null);
    resetForm();
  };

  if (loadingDepartments) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading departments...
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-md shadow-lg min-h-full flex-1">
      <header className="text-left flex-1 py-4 sm:px-6 px-3">
        <h1 className="text-3xl font-bold text-blue-800">Approval Matrix</h1>
        <p className="text-gray-600 mt-2">
          Manage approval matrix for each document type (sub-department)
        </p>
      </header>

      <div className="p-6 space-y-6">
        {/* Department and Document Type Selection */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Document Selection
            </h3>
            {(selectedDepartment || selectedDocumentType) && (
              <button
                onClick={clearSelection}
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
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.value} value={dept.label}>
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
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedDepartment}
                >
                  <option value="">
                    {documentTypeOptions.length === 0
                      ? 'No document types available'
                      : 'Select Document Type'}
                  </option>
                  {documentTypeOptions.map((docType: any) => (
                    <option key={docType.value} value={docType.label}>
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
                Existing approval matrix found. Editing will update the current
                configuration.
              </p>
            </div>
          )}
        </div>

        {/* Approval Configuration - Only show when document type is selected */}
        {selectedDocumentType && (
          <>
            {/* Sequence Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sequence Level <span className="text-red-500">*</span>
              </label>
              <select
                value={sequenceLevel}
                onChange={(e) => setSequenceLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Sequence Level</option>
                {sequenceLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Approval Rule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Approval Rule <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="ALL"
                    checked={approvalRule === 'ALL'}
                    onChange={(e) => setApprovalRule(e.target.value)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span>ALL (All approvers must approve)</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="Majority"
                    checked={approvalRule === 'Majority'}
                    onChange={(e) => setApprovalRule(e.target.value)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span>Majority</span>
                  <select
                    value={numberOfApprovers}
                    onChange={(e) => setNumberOfApprovers(e.target.value)}
                    disabled={approvalRule !== 'Majority'}
                    className="ml-2 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {Array.from({ length: approvers.length }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Approvers Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Approvers <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addApprover}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Approver</span>
                </button>
              </div>

              <div className="space-y-4">
                {approvers.map((approver, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={approver.type === 'Position'}
                            onChange={() =>
                              updateApprover(index, 'type', 'Position')
                            }
                            className="form-radio h-4 w-4 text-blue-600"
                          />
                          <span>Position</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={approver.type === 'Employee'}
                            onChange={() =>
                              updateApprover(index, 'type', 'Employee')
                            }
                            className="form-radio h-4 w-4 text-blue-600"
                          />
                          <span>Employee</span>
                        </label>
                      </div>

                      {approvers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeApprover(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {approver.type}{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={approver.value}
                          onChange={(e) =>
                            updateApprover(index, 'value', e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select {approver.type}</option>
                          {(approver.type === 'Position'
                            ? positions
                            : employees
                          ).map((item: any) => (
                            <option key={item.ID} value={item.ID}>
                              {approver.type === 'Position'
                                ? item.Name
                                : `${item.FirstName} ${item.LastName}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount From <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={approver.amountFrom}
                          onChange={(e) =>
                            updateApprover(index, 'amountFrom', e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount To <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={approver.amountTo}
                          onChange={(e) =>
                            updateApprover(index, 'amountTo', e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={clearSelection}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                <span>Save Approval Matrix</span>
              </button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedDocumentType && (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-lg p-8">
              <p className="text-gray-500 text-lg">
                Please select a department and document type to configure the
                approval matrix
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalMatrix;
