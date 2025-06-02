import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null; // or <LoadingSpinner />
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};
