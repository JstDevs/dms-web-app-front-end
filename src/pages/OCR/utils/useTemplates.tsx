import axios from "@/api/axios";
import { useEffect, useState } from "react";

export interface TemplateField {
  id: number;
  fieldName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Template {
  ID: number;
  name: string;
  departmentId: number;
  subDepartmentId: number;
  imageWidth: number;
  imageHeight: number;
  samplePdfPath: string;
  fields: TemplateField[];
}

export interface TemplateOption {
  value: string;
  label: string;
}

export const useTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get("/templates");
        const data = response.data;

        setTemplates(data);

        const options: TemplateOption[] = data.map((t: Template) => ({
          value: String(t.ID),
          label: t.name,
        }));

        setTemplateOptions(options);
      } catch (err) {
        setError(err);
        console.error("Failed to fetch templates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return { templates, templateOptions, loading, error };
};
