// frontend/src/layouts/MainLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import { Menu } from "lucide-react";
import "./MainLayout.css";
import { useTranslation } from "react-i18next";
import NotificationBell from "./components/NotificationBell";
import LangToggle from "../shared/components/LangToggle";

const MainLayout = ({ userRole = "Admin" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useTranslation();

  return (
    <div className="main-layout">
      <AdminSidebar isOpen={sidebarOpen} />
      <div className={`main-content ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
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
            <LangToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;