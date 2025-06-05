// src/services/moduleService.ts
import axios from "@/api/axios";

export interface Module {
  ID: number;
  Description: string;
}

export const fetchModules = async (): Promise<Module[]> => {
  const response = await axios.get(`/useraccess/modules`);
  return response.data;
};

export const createModule = async (
  moduleData: Omit<Module, "ID">
): Promise<Module> => {
  const response = await axios.post(`/useraccess/modules`, moduleData);
  return response.data;
};

export const updateModule = async (
  id: number,
  moduleData: Partial<Module>
): Promise<Module> => {
  const response = await axios.put(`/useraccess/modules/${id}`, moduleData);
  return response.data;
};

export const deleteModule = async (id: number): Promise<void> => {
  await axios.delete(`/useraccess/modules/${id}`);
};
