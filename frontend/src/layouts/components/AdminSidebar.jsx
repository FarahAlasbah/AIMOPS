// frontend/src/layouts/components/AdminSidebar.jsx
import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  Calendar,
  CalendarDays,
  FileText,
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
import { isAdminUser } from "../../shared/permissions/rolePermissions";

import "./AdminSidebar.css";

const AdminSidebar = ({ isOpen }) => {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { t } = useTranslation();

  const adminUser = isAdminUser(user);

  const isActive = (path) => {
    if (path === "/app/overview") {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = (event) => {
    event.preventDefault();
    event.stopPropagation();
    logout();
  };

  const menuItems = [
    {
      key: "overview",
      path: "/app/overview",
      icon: LayoutDashboard,
      perm: "dashboard.view",
    },
    {
      key: "businessProfile",
      path: "/app/business-profile",
      icon: Building2,
      perm: "business_profile.view",
    },
    {
      key: "dataUpload",
      path: "/app/data-upload",
      icon: Upload,
      perm: "data.upload",
    },
    {
      key: "products",
      path: "/app/products",
      icon: Package,
      perm: "products.view",
    },
    {
      key: "forecasting",
      path: "/app/forecasting",
      icon: TrendingUp,
      perm: "forecasts.view",
    },
    {
      key: "campaigns",
      path: "/app/campaigns",
      icon: Megaphone,
      perm: "campaigns.view",
    },
    {
      key: "consultation",
      path: "/app/consultation",
      icon: MessageSquare,
      perm: "consultation.view",
    },
    {
      key: "events",
      path: "/app/events",
      icon: CalendarDays,
      perm: "events.view",
    },
    {
      key: "calendar",
      path: "/app/calendar",
      icon: Calendar,
      perm: "calendar.view",
    },
    {
      key: "reports",
      path: "/app/reports",
      icon: FileText,
      perm: "reports.view",
    },
    {
      key: "userManagement",
      path: "/app/user-management",
      icon: Users,
      perm: "users.view",
      adminOnly: true,
    },
  ].filter((item) => {
    if (item.adminOnly && !adminUser) return false;
    return hasPermission(item.perm);
  });

  const showProfileLink = hasPermission("profile.view");

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <div className="brand">
          <Link
            to="/app/overview"
            className="brand-link"
            aria-label="Go to dashboard"
          >
            <span className="brand-text">AIMOPS</span>
          </Link>
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
        {showProfileLink ? (
          <Link
            to="/app/profile"
            className="user-profile"
            style={{ textDecoration: "none" }}
          >
            <div className="user-avatar">
              <User size={20} />
            </div>

            <div className="user-info">
              <div className="user-name">
                {user?.full_name || user?.username || "User"}
              </div>

              <div className="user-role">
                {user?.role?.display_name || user?.role_name || "User"}
              </div>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </Link>
        ) : (
          <div className="user-profile">
            <div className="user-avatar">
              <User size={20} />
            </div>

            <div className="user-info">
              <div className="user-name">
                {user?.full_name || user?.username || "User"}
              </div>

              <div className="user-role">
                {user?.role?.display_name || user?.role_name || "User"}
              </div>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;