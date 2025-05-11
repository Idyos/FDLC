import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const AdminRoutes = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};