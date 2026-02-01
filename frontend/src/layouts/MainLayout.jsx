// frontend/src/layouts/MainLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import { Menu } from "lucide-react";
import "./MainLayout.css";
import { useTranslation } from "react-i18next";

const MainLayout = ({ userRole = "Admin" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith("ar") ? "ar" : "en";

  const handleLangChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="main-layout">
      <AdminSidebar isOpen={sidebarOpen} />

      <div className={`main-content ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {/* Header */}
        <header className="app-header">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="menu-button"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>

          <h1 className="page-title">
            {t("layout.welcomeTitle", { defaultValue: "Welcome to AIMOPS" })}
          </h1>

          <div className="header-actions">
            {/* Language Switcher */}
            <div className="lang-switcher">
              <label htmlFor="lang" className="sr-only">
                Language
              </label>
              <select id="lang" value={currentLang} onChange={handleLangChange}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {/* Add notifications, profile dropdown, etc. */}
          </div>
        </header>

        {/* Main Content */}
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
