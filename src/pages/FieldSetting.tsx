import { Button } from '@chakra-ui/react';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { OCRField, fetchOCRFields } from './OCR/Fields/ocrFieldService';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { MODULE_IDS } from '@/constants/moduleIds';
 

type FieldSettingsPanelProps = {
  // showFieldsPanel: boolean;
  // setShowFieldsPanel: (value: boolean) => void;
  fieldsInfo: (OCRField & { Type?: string; FieldID?: number })[];
  masterFields?: OCRField[]; // All available master fields from OCRFieldsManagement
  onSave: (
    updatedFields: {
      ID: number;
      Field: string;
      Type: string;
      Description: string;
      active: boolean;
      FieldID?: number; // Link to master field
    }[]
  ) => void;
  onCancel: (
    resetFields: {
      ID: number;
      Field: string;
      Type: string;
      Description: string;
      active: boolean;
      FieldID?: number;
    }[]
  ) => void;
  readOnly?: boolean;
};

export const FieldSettingsPanel = forwardRef(
  (
    {
      // showFieldsPanel,
      // setShowFieldsPanel,
      fieldsInfo,
      masterFields = [],
      onSave,
      onCancel,
      readOnly = false,
    }: FieldSettingsPanelProps,
    ref: React.Ref<any>
  ) => {
    const [masterFieldsList, setMasterFieldsList] = useState<OCRField[]>([]);
    const [fields, setFields] = useState<
      {
        ID: number;
        Field: string;
        Type: string;
        Description: string;
        active: boolean;
        FieldID?: number; // Link to master field
        FieldNumber?: number; // For tracking which slot (1-10)
      }[]
    >([]);
    const [saving, setSaving] = useState(false);
    const isReadOnly = Boolean(readOnly);

    // Fetch master fields if not provided
    useEffect(() => {
      const loadMasterFields = async () => {
        if (masterFields && masterFields.length > 0) {
          setMasterFieldsList(masterFields);
        } else {
          try {
            const fetched = await fetchOCRFields();
            setMasterFieldsList(fetched || []);
          } catch (error) {
            console.error('Failed to fetch master fields:', error);
            setMasterFieldsList([]);
          }
        }
      };
      loadMasterFields();
    }, [masterFields]);

    // Initialize with 10 slots, populate with existing fieldsInfo
    useEffect(() => {
      // Create 10 slots (FieldNumber 1-10)
      const slots: {
        ID: number;
        Field: string;
        Type: string;
        Description: string;
        active: boolean;
        FieldID?: number;
        FieldNumber: number;
      }[] = [];
      
      for (let i = 1; i <= 10; i++) {
        // Find if there's an existing field for this slot
        const existingField = fieldsInfo.find((f: any) => {
          const fieldNumber = f.FieldNumber || (f.ID <= 10 ? f.ID : 0);
          return fieldNumber === i && (f as any).IsActive !== false;
        });
        
        if (existingField) {
          slots.push({
            ID: existingField.ID || i,
            Field: existingField.Field || '',
            Type: existingField.Type || 'text',
            Description: existingField.Field || '',
            active: (existingField as any).IsActive !== false,
            FieldID: existingField.FieldID || existingField.ID,
            FieldNumber: i,
          });
        } else {
          // Empty slot
          slots.push({
            ID: i + 10000, // Temporary ID for empty slots
            Field: '',
            Type: 'text',
            Description: '',
            active: false,
            FieldID: undefined,
            FieldNumber: i,
          });
        }
      }
      
      setFields(slots);
    }, [fieldsInfo]);

    const toggleFieldActive = (index: number) => {
      if (isReadOnly) return;
      setFields((prev) =>
        prev.map((field, i) =>
          i === index ? { ...field, active: !field.active } : field
        )
      );
    };

    const handleFieldSelection = (index: number, masterFieldId: string) => {
      if (isReadOnly) return;
      const selectedMasterField = masterFieldsList.find(mf => mf.ID === Number(masterFieldId));
      
      if (selectedMasterField) {
        setFields((prev) =>
          prev.map((field, i) =>
            i === index
              ? {
                  ...field,
                  Field: selectedMasterField.Field,
                  Description: selectedMasterField.Field,
                  FieldID: selectedMasterField.ID,
                  active: true, // Auto-activate when field is selected
                }
              : field
          )
        );
      } else if (masterFieldId === '') {
        // Clear selection
        setFields((prev) =>
          prev.map((field, i) =>
            i === index
              ? {
                  ...field,
                  Field: '',
                  Description: '',
                  FieldID: undefined,
                  active: false,
                }
              : field
          )
        );
      }
    };

    const handleTypeChange = (index: number, type: string) => {
      if (isReadOnly) return;
      setFields((prev) =>
        prev.map((field, i) => (i === index ? { ...field, Type: type } : field))
      );
    };

    const handleSave = async () => {
      if (isReadOnly) return;
      if (saving) return;
      setSaving(true);
      try {
        // Return ALL fields that have a FieldID selected (both active and inactive)
        // This allows deactivating fields that were previously active
        const fullPayload = fields
          .filter(f => f.FieldID) // Only fields with selected master field (can be active or inactive)
          .map(({ ID, Field, Type, Description, active, FieldID, FieldNumber }) => ({
            ID: FieldNumber || ID, // Use FieldNumber if available
            Field,
            Type,
            Description,
            active,
            FieldID, // Include FieldID to link to master
            FieldNumber, // Include FieldNumber for proper slot mapping
          }));
        await Promise.resolve(onSave(fullPayload));
      } finally {
        setSaving(false);
      }
    };

    const handleCancel = () => {
      setFields((prev) => prev.map((field) => ({ ...field, active: false })));
      // setShowFieldsPanel(false);
      onCancel(fields);
    };

    // Removed filteredFields - using fields directly
    // 🔁 Expose `handleCancel` to parent
    useImperativeHandle(ref, () => ({
      cancelFields: handleCancel,
    }));
    const fieldPermissions = useModulePermissions(MODULE_IDS.fields);
    return (
      <div className="bg-white border rounded-xl p-3 sm:p-6 space-y-4 mt-6 shadow-md">
        {/* Search Bar removed */}

        {isReadOnly && (
          <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
            You do not have permission to modify these fields.
          </div>
        )}

        {/* Dynamic Fields - 10 slots with dropdowns */}
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-2">
            Select up to 10 fields from master data (OCRFieldsManagement)
          </div>
          {fields.map((field, index) => {
            const uniqueKey = `field-slot-${field.FieldNumber || index}`;
            // Get already selected FieldIDs to disable them in other dropdowns
            // Only disable if field is active (to allow changing inactive fields)
            const selectedFieldIDs = fields
              .filter((f, i) => i !== index && f.FieldID && f.active)
              .map(f => f.FieldID)
              .filter((id): id is number => id !== undefined);
            
            return (
            <div
              key={uniqueKey}
              className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-50"
            >
              {/* Slot Number + Checkbox + Field Dropdown */}
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-gray-500 w-8">
                  {field.FieldNumber || index + 1}:
                </span>
                <input
                  type="checkbox"
                  checked={field.active}
                  onChange={() => toggleFieldActive(index)}
                  className="h-4 w-4 cursor-pointer flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!field.FieldID || isReadOnly} // Disable checkbox if no field selected or read-only
                />
                <select
                  className="flex-1 px-3 py-2 border rounded text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={field.FieldID || ''}
                  onChange={(e) => handleFieldSelection(index, e.target.value)}
                  disabled={isReadOnly} // Disable in read-only mode
                >
                  <option value="">-- Select Field --</option>
                  {masterFieldsList.length > 0 ? (
                    masterFieldsList.map((mf) => (
                      <option
                        key={mf.ID}
                        value={mf.ID}
                        disabled={selectedFieldIDs.includes(mf.ID)} // Disable if already selected
                      >
                        {mf.Field} {selectedFieldIDs.includes(mf.ID) ? '(Already selected)' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Loading fields...</option>
                  )}
                </select>
              </div>

              {/* Radio Buttons */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <label className="text-sm flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`type-${index}`}
                    value="text"
                    checked={field.Type === 'text'}
                    onChange={() => handleTypeChange(index, 'text')}
                    className="cursor-pointer"
                    disabled={!field.FieldID || isReadOnly}
                  />
                  Text
                </label>
                <label className="text-sm flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`type-${index}`}
                    value="date"
                    checked={field.Type === 'date'}
                    onChange={() => handleTypeChange(index, 'date')}
                    className="cursor-pointer"
                    disabled={!field.FieldID || isReadOnly}
                  />
                  Date
                </label>
              </div>
            </div>
            );
          })}
        </div>

        {/* No Results Message removed with search */}

        {/* Footer */}
        {fields.length > 0 ? (
          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-3">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {fieldPermissions?.Add && !isReadOnly && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm w-full"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              )}
              <Button
                className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm w-full"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <h2 className="text-lg text-center text-gray-500">
            No fields available
          </h2>
        )}
      </div>
    );
  }
);
