import { getToken } from "@/utils/token";
import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add token to every request
instance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: Add response interceptor to handle errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Silently handle 404 errors for audit/user-activities endpoint (not implemented yet)
    if (error.config?.url?.includes('/audit/user-activities') && error.response?.status === 404) {
      // Return a fake response with success: false to prevent console error
      return Promise.resolve({ data: { success: false } });
    }
    return Promise.reject(error);
  }
);

export default instance;
