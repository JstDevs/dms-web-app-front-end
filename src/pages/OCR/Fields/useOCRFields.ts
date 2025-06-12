import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  fetchOCRFields,
  createOCRField,
  updateOCRField,
  deleteOCRField,
  OCRField,
} from "./ocrFieldService";

export const useOCRFields = () => {
  const [fields, setFields] = useState<OCRField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFields = async () => {
    try {
      setLoading(true);
      const data = await fetchOCRFields();
      setFields(data);
      setError(null);
    } catch (err) {
      setError("Failed to load OCR fields");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addField = async (fieldData: { Field: string }) => {
    try {
      const newField = await createOCRField(fieldData);
      setFields((prev) => [...prev, newField]);
      toast.success("OCR field created successfully");
      return true;
    } catch (err) {
      toast.error("Failed to create OCR field");
      console.error(err);
      return false;
    }
  };

  const editField = async (id: number, fieldData: { Field: string }) => {
    try {
      const updatedField = await updateOCRField(id, fieldData);
      setFields((prev) =>
        prev.map((field) => (field.ID === id ? updatedField : field))
      );
      toast.success("OCR field updated successfully");
      return true;
    } catch (err) {
      toast.error("Failed to update OCR field");
      console.error(err);
      return false;
    }
  };

  const removeField = async (id: number) => {
    try {
      await deleteOCRField(id);
      setFields((prev) => prev.filter((field) => field.ID !== id));
      toast.success("OCR field deleted successfully");
      return true;
    } catch (err) {
      toast.error("Failed to delete OCR field");
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  return {
    fields,
    loading,
    error,
    addField,
    editField,
    removeField,
    refreshFields: loadFields,
  };
};
