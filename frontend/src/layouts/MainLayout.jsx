import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

import AdminSidebar from "./components/AdminSidebar";
import NotificationBell from "./components/NotificationBell";
import LangToggle from "../shared/components/LangToggle";

import { ConsultationProvider } from "../features/consultation/context/ConsultationProvider";
import { useConsultation } from "../features/consultation/hooks/useConsultation";
import ConsultationFloatingButton from "../features/consultation/components/ConsultationFloatingButton";
import ConsultationDrawer from "../features/consultation/components/ConsultationDrawer";

import "./MainLayout.css";

function MainLayoutFrame() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useTranslation();
  const { isDrawerOpen, isDrawerExpanded } = useConsultation();

  return (
    <div className="main-layout">
      <AdminSidebar isOpen={sidebarOpen} />

      <div
        className={`main-content ${sidebarOpen ? "sidebar-open" : "sidebar-closed"} ${
          isDrawerOpen ? "consultation-drawer-open" : ""
        } ${isDrawerOpen && isDrawerExpanded ? "consultation-drawer-expanded" : ""}`}
      >
        <header className="app-header">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="menu-button"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>

          

          <div className="header-actions">
            <LangToggle />
            <NotificationBell />
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>

      <ConsultationFloatingButton />
      <ConsultationDrawer />
    </div>
  );
}

const MainLayout = () => {
  return (
    <ConsultationProvider>
      <MainLayoutFrame />
    </ConsultationProvider>
  );
};

export default MainLayout;