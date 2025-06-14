import axios from "@/api/axios";

type ModulePermission = {
  ID: string;
  Description: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
};

export type AddUserAccessPayload = {
  description: string;
  modulePermissions: ModulePermission[];
};

export type EditUserAccessPayload = AddUserAccessPayload & {
  currentDescription: string;
};
export const addUserAccess = async (payload: AddUserAccessPayload) => {
  const response = await axios.post("/useraccess/add", payload);

  const data = response.data;
  console.log(data, "addUserAccess");
  return data;
};

export const editUserAccess = async (
  payload: EditUserAccessPayload,
  id: number
) => {
  const response = await axios.put(`/useraccess/edit/${id}`, payload);

  const data = response.data;
  console.log(data, payload, id, "editUserAccess");
  return data;
};

export const getAllUserAccess = async () => {
  const response = await axios.get(`/userAccess`);

  const data = response.data;
  console.log(data, "addUserAccess");
  return data;
};

export const deleteUserAccessRole = async (id: number) => {
  const response = await axios.delete(`/useraccess/${id}`);
  return response.data;
};
