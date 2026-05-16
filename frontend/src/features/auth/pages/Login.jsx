import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../../shared/contexts/AuthContext";
import LangToggle from "../../../shared/components/LangToggle";

import LoginBrandPanel from "../components/LoginBrandPanel";
import LoginForm from "../components/LoginForm";
import { useLoginForm } from "../hooks/useLoginForm";

import "./Login.css";

const Login = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const loginForm = useLoginForm(t);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/overview", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="login-page">
      <div className="login-lang">
        <LangToggle />
      </div>

      <main className="login-container">
        <LoginBrandPanel t={t} />
        <LoginForm t={t} {...loginForm} />
      </main>
    </div>
  );
};

export default Login;