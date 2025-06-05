// src/components/ModuleForm.tsx
import { useState, useEffect } from "react";
import { Button } from "@chakra-ui/react";

interface ModuleFormProps {
  module?: {
    ID: number;
    Description: string;
  } | null;
  onSubmit: (data: { Description: string }) => Promise<void>;
  onCancel: () => void;
}

const ModuleForm = ({ module, onSubmit, onCancel }: ModuleFormProps) => {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (module) {
      setDescription(module.Description);
    } else {
      setDescription("");
    }
  }, [module]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        Description: description.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description *
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
          {module ? "Update Module" : "Add Module"}
        </Button>
      </div>
    </form>
  );
};

export default ModuleForm;
