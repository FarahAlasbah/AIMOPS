// frontend/src/layouts/AuthLayout.jsx
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

const AuthLayout = () => {
  const { t } = useTranslation("common");

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <h1>{t("appName")}</h1>
          <p>{t("auth.tagline")}</p>
        </div>

        <main className="auth-content">
          <Outlet />
        </main>

        <footer className="auth-footer">
          <p>{t("auth.footer")}</p>
        </footer>
      </div>
    </div>
  );
};

export default AuthLayout;