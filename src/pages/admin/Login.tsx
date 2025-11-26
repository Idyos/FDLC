import { getAuth } from "firebase/auth";
import LoginForm from "@/components/admin/Login/LoginForm";
import { useState } from "react";
import RegisterForm from "@/components/admin/Login/RegisterForm";
import { useNavigate } from "react-router-dom";
import { navigateWithQuery } from "@/utils/url";

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);  
    const auth = getAuth();
    
    const navigate = useNavigate();

    const handleClick = () => {
      navigateWithQuery(navigate, `/admin`, {}); 
    };


    return isLogin 
    ? <LoginForm auth={auth} setIsLogin={setIsLogin} onClick={handleClick}/>
    : <RegisterForm auth={auth} setIsLogin={setIsLogin} onClick={handleClick}/>;
}