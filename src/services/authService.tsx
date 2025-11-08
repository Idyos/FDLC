import { useAuth } from "@/routes/admin/AuthContext";
import { useLocation } from "react-router-dom";

export function isAdmin(): boolean{
    const { user } = useAuth();
    const location = useLocation();
    const isAdmin = user !== null && location.pathname.startsWith("/admin");
    
    return isAdmin;
}