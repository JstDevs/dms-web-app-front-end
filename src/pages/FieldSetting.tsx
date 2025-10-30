import { Button } from '@chakra-ui/react';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { OCRField } from './OCR/Fields/ocrFieldService';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
 

type FieldSettingsPanelProps = {
  // showFieldsPanel: boolean;
  // setShowFieldsPanel: (value: boolean) => void;
  fieldsInfo: (OCRField & { Type?: string })[];
  onSave: (
    updatedFields: {
      ID: number;
      Field: string;
      Type: string;
      Description: string;
      active: boolean;
    }[]
  ) => void;
  onCancel: (
    resetFields: {
      ID: number;
      Field: string;
      Type: string;
      Description: string;
      active: boolean;
    }[]
  ) => void;
};

export const FieldSettingsPanel = forwardRef(
  (
    {
      // showFieldsPanel,
      // setShowFieldsPanel,
      fieldsInfo,
      onSave,
      onCancel,
    }: FieldSettingsPanelProps,
    ref: React.Ref<any>
  ) => {
    // Removed search bar
    const [fields, setFields] = useState<
      {
        ID: number;
        Field: string;
        Type: string;
        Description: string;
        active: boolean;
      }[]
    >([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (fieldsInfo?.length > 0) {
        setFields(
          fieldsInfo.map((f) => ({
            ...f,
            Type: f.Type || 'text', // Use Type from fieldsInfo or default to text
            Description: f.Field, // Set default description to field name
            active: (f as any).IsActive !== false, // Check based on IsActive flag from DB
          }))
        );
      }
    }, [fieldsInfo]);

    const toggleFieldActive = (index: number) => {
      setFields((prev) =>
        prev.map((field, i) =>
          i === index ? { ...field, active: !field.active } : field
        )
      );
    };

    const handleDescriptionChange = (index: number, value: string) => {
      setFields((prev) =>
        prev.map((field, i) =>
          i === index ? { ...field, Description: value } : field
        )
      );
    };

    const handleTypeChange = (index: number, type: string) => {
      setFields((prev) =>
        prev.map((field, i) => (i === index ? { ...field, Type: type } : field))
      );
    };

    const handleSave = async () => {
      if (saving) return;
      setSaving(true);
      try {
        // Return all fields with their current active state to allow both activation and deactivation
        const fullPayload = fields.map(({ ID, Field, Type, Description, active }) => ({
          ID,
          Field,
          Type,
          Description,
          active,
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

    const filteredFields = fields;
    // 🔁 Expose `handleCancel` to parent
    useImperativeHandle(ref, () => ({
      cancelFields: handleCancel,
    }));
    const allocationPermissions = useModulePermissions(7); // 1 = MODULE_ID
    return (
      <div className="bg-white border rounded-xl p-3 sm:p-6 space-y-4 mt-6 shadow-md">
        {/* Search Bar removed */}

        {/* Dynamic Fields */}
        <div className="space-y-3">
          {filteredFields.map((field) => {
            // Find the original index in the fields array for proper state management
            const originalIndex = fields.findIndex(f => f.ID === field.ID);
            return (
            <div
              key={field.ID}
              className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-50"
            >
              {/* Checkbox + Description Input */}
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={field.active}
                  onChange={() => toggleFieldActive(originalIndex)}
                  className="h-4 w-4 cursor-pointer flex-shrink-0"
                />
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border rounded text-sm"
                  placeholder="Field name"
                  value={field.Description}
                  onChange={(e) =>
                    handleDescriptionChange(originalIndex, e.target.value)
                  }
                />
              </div>

              {/* Radio Buttons */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <label className="text-sm flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`type-${originalIndex}`}
                    value="text"
                    checked={field.Type === 'text'}
                    onChange={() => handleTypeChange(originalIndex, 'text')}
                    className="cursor-pointer"
                  />
                  Text
                </label>
                <label className="text-sm flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`type-${originalIndex}`}
                    value="date"
                    checked={field.Type === 'date'}
                    onChange={() => handleTypeChange(originalIndex, 'date')}
                    className="cursor-pointer"
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
              {allocationPermissions?.Add && (
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
