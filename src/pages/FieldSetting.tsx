import { Button } from '@chakra-ui/react';
import { forwardRef, useEffect, useImperativeHandle, useState, useMemo } from 'react';
import { OCRField } from './OCR/Fields/ocrFieldService';
import { useModulePermissions } from '@/hooks/useDepartmentPermissions';
import { Search, X } from 'lucide-react';

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
    const [selectedField, setSelectedField] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [fields, setFields] = useState<
      {
        ID: number;
        Field: string;
        Type: string;
        Description: string;
        active: boolean;
      }[]
    >([]);

    useEffect(() => {
      if (fieldsInfo?.length > 0) {
        setFields(
          fieldsInfo.map((f) => ({
            ...f,
            Type: f.Type || 'text', // Use Type from fieldsInfo or default to text
            Description: '',
            active: false,
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

    const handleSave = () => {
      const activeFields = fields
        .filter((f) => f.active)
        .map(({ ID, Field, Type, Description }) => ({
          ID,
          Field,
          Type,
          Description,
        }));
      onSave(activeFields); // Pass data to parent
      // setShowFieldsPanel(false);
    };

    const handleCancel = () => {
      setFields((prev) => prev.map((field) => ({ ...field, active: false })));
      // setShowFieldsPanel(false);
      onCancel(fields);
    };

    // Filter fields based on search term
    const filteredFields = useMemo(() => {
      if (!searchTerm.trim()) {
        return fields;
      }
      
      return fields.filter(field =>
        field.Field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.ID.toString().includes(searchTerm)
      );
    }, [fields, searchTerm]);

    const clearSearch = () => {
      setSearchTerm('');
    };
    // 🔁 Expose `handleCancel` to parent
    useImperativeHandle(ref, () => ({
      cancelFields: handleCancel,
    }));
    const allocationPermissions = useModulePermissions(7); // 1 = MODULE_ID
    return (
      <div className="bg-white border rounded-xl p-3 sm:p-6 space-y-4 mt-6 shadow-md">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search fields by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              Showing {filteredFields.length} of {fields.length} fields
            </p>
          )}
        </div>

        {/* Dynamic Fields */}
        <div className="space-y-3">
          {filteredFields.map((field, index) => {
            // Find the original index in the fields array for proper state management
            const originalIndex = fields.findIndex(f => f.ID === field.ID);
            return (
            <div
              key={field.ID}
              onClick={() => setSelectedField(originalIndex)}
              className={`grid grid-cols-1 sm:grid-cols-5 gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all ${
                selectedField === originalIndex
                  ? 'bg-blue-100 border border-blue-600'
                  : 'bg-gray-50'
              }`}
            >
              {/* Field Label + Toggle */}
              <div className="flex justify-between items-center sm:col-span-1">
                <span className="text-sm font-medium text-gray-700">
                  {field.Field}
                </span>
                <input
                  type="checkbox"
                  checked={field.active}
                  onChange={() => toggleFieldActive(originalIndex)}
                  className="h-4 w-4"
                />
              </div>

              {/* Description Input */}
              <div className="sm:col-span-2">
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder="Add comment/description"
                  value={field.Description}
                  disabled={!field.active}
                  onChange={(e) =>
                    handleDescriptionChange(originalIndex, e.target.value)
                  }
                />
              </div>

              {/* Radio Buttons */}
              <div className="flex flex-col sm:flex-row items-start justify-center sm:items-center gap-2 sm:gap-4 sm:col-span-2">
                <label className="text-sm flex items-center gap-1">
                  <input
                    type="radio"
                    name={`type-${originalIndex}`}
                    value="text"
                    checked={field.Type === 'text'}
                    disabled={!field.active}
                    onChange={() => handleTypeChange(originalIndex, 'text')}
                  />
                  Text
                </label>
                <label className="text-sm flex items-center gap-1">
                  <input
                    type="radio"
                    name={`type-${originalIndex}`}
                    value="date"
                    checked={field.Type === 'date'}
                    disabled={!field.active}
                    onChange={() => handleTypeChange(originalIndex, 'date')}
                  />
                  Date
                </label>
              </div>
            </div>
            );
          })}
        </div>

        {/* No Results Message */}
        {filteredFields.length === 0 && fields.length > 0 && (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              No fields match your search
            </h3>
            <p className="text-sm text-gray-400">
              Try adjusting your search terms or{' '}
              <button
                onClick={clearSearch}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                clear the search
              </button>
            </p>
          </div>
        )}

        {/* Footer */}
        {fields.length > 0 ? (
          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-3">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {allocationPermissions?.Add && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm w-full"
                  onClick={handleSave}
                  disabled={fields.every((f) => !f.active)}
                >
                  Save
                </Button>
              )}
              <Button
                className="bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded text-sm w-full"
                onClick={handleCancel}
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
