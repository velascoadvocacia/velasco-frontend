import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { PerfilUsuario } from "../types/api";

interface ProtectedRouteProps {
  allowedRoles: PerfilUsuario[];
  children: ReactElement;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
