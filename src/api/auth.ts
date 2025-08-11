import { User } from '@/types/User';
import axios from '@/api/axios';
import { removeToken, removeUserFromStorage } from '@/utils/token';

interface LoginResponse {
  token: string;
  user: User;
}

interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterUserPayload {
  userName: string;
  password: string;
  confirmPassword: string;
  userAccessArray: string;
}
export interface UpdateUserPayload {
  userName: string;
  password: string;
  cpassword: string;
  id: number | undefined;
  userAccessArray: string;
}
// ---------------LOGIN---------------
export async function fetchLogin(
  userName: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>('/auth/login', {
    userName,
    password,
  });
  return data;
}
// ---------------LOGOUT-------------------
export function logoutUser() {
  removeToken();
  removeUserFromStorage();
}
// -------------CHANGE PASSWORD----------------
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  try {
    const { data } = await axios.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmNewPassword: newPassword,
    });
    return data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Password change failed';
    throw new Error(message);
  }
}
// -------------REGISTER USER---------------

export async function registerUser(
  user: RegisterUserPayload
): Promise<{ message: string }> {
  try {
    const { data } = await axios.post('/auth/register', user);
    return data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'User registration failed';
    throw new Error(message);
  }
}
// -------------REGISTER USER---------------

export async function updateUser(
  user: UpdateUserPayload
): Promise<{ message: string }> {
  try {
    const { data } = await axios.post('/users/edit', user);
    return data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'User registration failed';
    throw new Error(message);
  }
}

// -----------------DELETE USER (SOFT)-----------------

export async function deleteUserSoft(id: number) {
  await axios.delete(`/users/delete/${id}`);
}
