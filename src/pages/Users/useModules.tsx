// src/hooks/useModules.ts
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  fetchModules,
  createModule,
  updateModule,
  deleteModule,
  Module,
} from "./moduleService";

export const useModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModules = async () => {
    try {
      setLoading(true);
      const data = await fetchModules();
      setModules(data);
      setError(null);
    } catch (err) {
      setError("Failed to load modules");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addModule = async (moduleData: Omit<Module, "ID">) => {
    try {
      const newModule = await createModule(moduleData);
      setModules((prev) => [...prev, newModule]);
      toast.success("Module created successfully");
      return true;
    } catch (err) {
      toast.error("Failed to create module");
      console.error(err);
      return false;
    }
  };

  const editModule = async (id: number, moduleData: Partial<Module>) => {
    try {
      const updatedModule = await updateModule(id, moduleData);
      setModules((prev) =>
        prev.map((module) => (module.ID === id ? updatedModule : module))
      );
      toast.success("Module updated successfully");
      return true;
    } catch (err) {
      toast.error("Failed to update module");
      console.error(err);
      return false;
    }
  };

  const removeModule = async (id: number) => {
    try {
      await deleteModule(id);
      setModules((prev) => prev.filter((module) => module.ID !== id));
      toast.success("Module deleted successfully");
      return true;
    } catch (err) {
      toast.error("Failed to delete module");
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  return {
    modules,
    loading,
    error,
    addModule,
    editModule,
    removeModule,
    refreshModules: loadModules,
  };
};
