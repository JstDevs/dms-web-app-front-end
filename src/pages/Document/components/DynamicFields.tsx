import React from 'react';
import { Input } from '@/components/ui/Input';
import { FieldAllocation } from '../utils/fieldAllocationService';
import { Calendar, FileText, AlertCircle } from 'lucide-react';

interface DynamicFieldProps {
  field: FieldAllocation;
  value: string | null;
  onChange: (value: string) => void;
  required?: boolean;
}

export const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  value,
  onChange,
  required = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  if (field.Type === 'date') {
    return (
      <div className="flex flex-col space-y-3 w-full">
        <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span>
            {field.Field}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
        <div className="relative w-full">
          <Input
            type="date"
            className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={handleDateChange}
            required={required}
            placeholder={`Select ${field.Field.toLowerCase()}`}
          />
          <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {field.Description && (
          <p className="text-sm text-gray-600 flex items-start gap-2 mt-1 bg-gray-50 p-2 rounded">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>{field.Description}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 w-full">
      <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
        <FileText className="w-5 h-5 text-blue-600" />
        <span>
          {field.Field}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>
      <div className="relative w-full">
        <Input
          type="text"
          className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          value={value || ''}
          onChange={handleChange}
          required={required}
          placeholder={`Enter ${field.Field.toLowerCase()}`}
        />
        <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      {field.Description && (
        <p className="text-sm text-gray-600 flex items-start gap-2 mt-1 bg-gray-50 p-2 rounded">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <span>{field.Description}</span>
        </p>
      )}
    </div>
  );
};

interface DynamicFieldsSectionProps {
  fields: FieldAllocation[];
  values: { [key: string]: string | null };
  onChange: (fieldId: number, value: string) => void;
  requiredFields?: number[];
}

export const DynamicFieldsSection: React.FC<DynamicFieldsSectionProps> = ({
  fields,
  values,
  onChange,
  requiredFields = [],
}) => {
  if (fields.length === 0) {
    return null;
  }

  // Separate fields by type for better organization
  const dateFields = fields.filter(f => f.Type === 'date');
  const textFields = fields.filter(f => f.Type !== 'date');

  return (
    <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200">
        <div className="p-2 bg-blue-600 rounded-lg">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            Additional Fields
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">
            Fill in the required fields based on your document type
          </p>
        </div>
      </div>

      {/* Date Fields Section */}
      {dateFields.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Date Fields
            </h4>
          </div>
          <div className="space-y-4">
            {dateFields.map((field) => (
              <div
                key={field.ID}
                className="bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all w-full"
              >
                <DynamicField
                  field={field}
                  value={values[`field_${field.ID}`] || null}
                  onChange={(value) => onChange(field.ID, value)}
                  required={requiredFields.includes(field.ID)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Fields Section */}
      {textFields.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Text Fields
            </h4>
          </div>
          <div className="space-y-4">
            {textFields.map((field) => (
              <div
                key={field.ID}
                className="bg-white rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all w-full"
              >
                <DynamicField
                  field={field}
                  value={values[`field_${field.ID}`] || null}
                  onChange={(value) => onChange(field.ID, value)}
                  required={requiredFields.includes(field.ID)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-6 pt-4 border-t border-blue-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            {fields.length} {fields.length === 1 ? 'field' : 'fields'} configured
          </span>
          {requiredFields.length > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <span className="text-red-500">*</span>
              {requiredFields.length} required {requiredFields.length === 1 ? 'field' : 'fields'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
