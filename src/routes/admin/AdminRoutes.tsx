import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LoadingAnimation from "@/components/shared/loadingAnim";

export const AdminRoutes = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingAnimation />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
