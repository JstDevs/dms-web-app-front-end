import React from 'react';
import { Input } from '@/components/ui/Input';
import { FieldAllocation } from './fieldAllocationService.ts';

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
      <div className="col-span-1">
        <label className="text-sm sm:text-base">
          {field.Field} {required && <span className="text-red-500">*</span>}
        </label>
        <Input
          type="date"
          className="w-full"
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={handleDateChange}
          required={required}
          placeholder={`Select ${field.Field.toLowerCase()}`}
        />
        {field.Description && (
          <p className="text-xs text-gray-500 mt-1">{field.Description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="col-span-1">
      <label className="text-sm sm:text-base">
        {field.Field} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        type="text"
        className="w-full"
        value={value || ''}
        onChange={handleChange}
        required={required}
        placeholder={`Enter ${field.Field.toLowerCase()}`}
      />
      {field.Description && (
        <p className="text-xs text-gray-500 mt-1">{field.Description}</p>
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Additional Information
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <DynamicField
            key={field.ID}
            field={field}
            value={values[`field_${field.ID}`] || null}
            onChange={(value) => onChange(field.ID, value)}
            required={requiredFields.includes(field.ID)}
          />
        ))}
      </div>
    </div>
  );
};
