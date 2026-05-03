import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  Calendar,
  CalendarDays,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Package,
  TrendingUp,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/contexts/AuthContext";
import "./AdminSidebar.css";

const AdminSidebar = ({ isOpen }) => {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { t } = useTranslation();

  const isActive = (path) => {
    if (path === "/app/overview") {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const menuItems = [
  { key: "overview", path: "/app/overview", icon: LayoutDashboard, perm: "dashboard.view" },
  { key: "businessProfile", path: "/app/business-profile", icon: Building2, perm: "dashboard.view" },
  { key: "dataUpload", path: "/app/data-upload", icon: Upload, perm: "data.upload" },
  { key: "products", path: "/app/products", icon: Package, perm: "products.view" },
  { key: "forecasting", path: "/app/forecasting", icon: TrendingUp, perm: "forecasts.view" },
  { key: "campaigns", path: "/app/campaigns", icon: Megaphone, perm: "campaigns.view" },
  { key: "consultation", path: "/app/consultation", icon: MessageSquare, perm: "dashboard.view" },
  { key: "events", path: "/app/events", icon: CalendarDays, perm: "events.view" },
  { key: "calendar", path: "/app/calendar", icon: Calendar, perm: "calendar.view" },
{ key: "reports", path: "/app/reports", icon: FileText, perm: "dashboard.view" },  { key: "userManagement", path: "/app/user-management", icon: Users, perm: "users.view" },
].filter((item) => hasPermission(item.perm));

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <div className="brand">
          <span className="brand-text">AIMOPS</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? "active" : ""}`}
            >
              <Icon className="nav-icon" size={20} />
              <span className="nav-text">{t(`nav.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Link to="/app/support" className="nav-item">
          <HelpCircle className="nav-icon" size={20} />
          <span className="nav-text">{t("nav.support")}</span>
        </Link>

        <Link to="/app/profile" className="user-profile" style={{ textDecoration: "none" }}>
          <div className="user-avatar">
            <User size={20} />
          </div>

          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.username || "User"}</div>
            <div className="user-role">
              {user?.role?.display_name || user?.role_name || "User"}
            </div>
          </div>

          <button
            className="logout-button"
            onClick={(event) => {
              event.preventDefault();
              logout();
            }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;
