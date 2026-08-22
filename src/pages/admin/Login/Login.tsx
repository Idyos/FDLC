import { getAuth } from "firebase/auth";
import LoginForm from "@/components/admin/Login/LoginForm";
import { useState } from "react";
import RegisterForm from "@/components/admin/Login/RegisterForm";
import { Navigate, useNavigate } from "react-router-dom";
import { navigateWithQuery } from "@/utils/url";
import { useAuth } from "@/routes/admin/AuthContext";
import LoadingAnimation from "@/components/shared/loadingAnim";

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const auth = getAuth();
    const { user, loading } = useAuth();

    const navigate = useNavigate();

    const handleClick = () => {
      navigateWithQuery(navigate, `/admin`, {});
    };

    if (loading) {
      return <LoadingAnimation />;
    }

    if (user) {
      return <Navigate to="/admin" replace />;
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center">
        {(
          isLogin
            ? <LoginForm auth={auth} onClick={handleClick}/>
            : <RegisterForm auth={auth} setIsLogin={setIsLogin} onClick={handleClick}/>
        )}
      </div>

    )
}