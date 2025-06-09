import axios from "@/api/axios";
import toast from "react-hot-toast";

type ModulePermission = {
  id: number;
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
  try {
    const response = await axios.post("/useraccess/add", payload);

    const data = response.data;
    console.log(data, "addUserAccess");
    toast.success("User access created successfully!");
    return data;
  } catch (error) {
    toast.error("Failed to create user access");
    throw error;
  }
};
export const editUserAccess = async (
  payload: EditUserAccessPayload,
  id: number
) => {
  // try {
  const response = await axios.put(`/useraccess/edit/${id}`, payload);

  const data = response.data;
  console.log(data, "editUserAccess");
  // toast.success("User access edited successfully!");
  return data;
  // } catch (error) {
  //   toast.error("Failed to create user access");
  //   throw error;
  // }
};
export const getAllUserAccess = async () => {
  try {
    const response = await axios.get(`/userAccess`);

    const data = response.data;
    console.log(data, "addUserAccess");
    // toast.success("Got All User Access successfully!");
    return data;
  } catch (error) {
    toast.error("Failed to create user access");
    throw error;
  }
};
