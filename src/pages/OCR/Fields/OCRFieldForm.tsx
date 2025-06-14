import { useState, useEffect } from "react";
import { Button } from "@chakra-ui/react";

interface OCRFieldFormProps {
  field?: {
    ID: number;
    Field: string;
    updatedAt?: string;
    createdAt?: string;
  } | null;
  onSubmit: (data: { Field: string }) => Promise<void>;
  onCancel: () => void;
}

const OCRFieldForm = ({ field, onSubmit, onCancel }: OCRFieldFormProps) => {
  const [fieldName, setFieldName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (field) {
      setFieldName(field.Field);
    } else {
      setFieldName("");
    }
  }, [field]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        Field: fieldName.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="field"
          className="block text-sm font-medium text-gray-700"
        >
          Field Name *
        </label>
        <input
          id="field"
          type="text"
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 bg-gray-100 hover:bg-gray-200 "
        >
          Cancel
        </Button>
        <Button
          type="submit"
          colorScheme="blue"
          loading={isSubmitting}
          className="px-4 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {field ? "Update Field" : "Add Field"}
        </Button>
      </div>
    </form>
  );
};

export default OCRFieldForm;
