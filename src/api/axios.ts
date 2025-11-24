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
    
    // Silently handle 403 errors for document analytics endpoint
    // This happens when user doesn't have Collaborate permission for the document's department
    // Common for new users, new departments, or documents from different departments
    const url = error.config?.url || error.request?.responseURL || error.config?.baseURL + error.config?.url || '';
    const isAnalyticsEndpoint = url.includes('/analytics') || url.endsWith('/analytics');
    const isDocumentsEndpoint = url.includes('/documents/documents/');
    
    if (isDocumentsEndpoint && isAnalyticsEndpoint && error.response?.status === 403) {
      // Return a fake response with success: false to prevent console error
      // The component will handle this gracefully
      // This prevents the error from propagating to catch blocks
      return Promise.resolve({ 
        data: { 
          success: false, 
          data: null 
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config
      });
    }
    
    return Promise.reject(error);
  }
);

export default instance;
