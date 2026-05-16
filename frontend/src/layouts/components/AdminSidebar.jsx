// frontend/src/layouts/components/AdminSidebar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  Calendar,
  CalendarDays,
  FileText,
  History,
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

function LogoutConfirmModal({ userName, onCancel, onConfirm }) {
  const { t } = useTranslation("common");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      className="logout-confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div className="logout-confirm-modal">
        <div className="logout-confirm-icon">
          <LogOut size={22} />
        </div>

        <h2 id="logout-confirm-title" className="logout-confirm-title">
          {t("layout.logoutConfirm.title")}
        </h2>

        <p className="logout-confirm-message">
          {userName
            ? t("layout.logoutConfirm.messageWithName", { name: userName })
            : t("layout.logoutConfirm.message")}
        </p>

        <div className="logout-confirm-actions">
          <button
            type="button"
            className="logout-confirm-cancel"
            onClick={onCancel}
          >
            {t("layout.logoutConfirm.cancel")}
          </button>

          <button
            type="button"
            className="logout-confirm-primary"
            onClick={onConfirm}
          >
            {t("layout.logoutConfirm.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

const AdminSidebar = ({ isOpen }) => {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { t } = useTranslation("common");

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const adminUser = isAdminUser(user);
  const userFallback = t("notifications.unknownUser");
  const userName = user?.full_name || user?.username || userFallback;
  const userRole = user?.role?.display_name || user?.role_name || userFallback;

  const isActive = (path) => {
    if (path === "/app/overview") {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogoutClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowLogoutConfirm(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
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
      key: "activityHistory",
      path: "/app/activity-history",
      icon: History,
      adminOnly: true,
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
    if (!item.perm) return true;

    return hasPermission(item.perm);
  });

  const showProfileLink = hasPermission("profile.view");

  return (
    <>
      <aside className={`admin-sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="brand">
            <Link
              to="/app/overview"
              className="brand-link"
              aria-label={t("layout.goToDashboard")}
            >
<span className="brand-text" lang="en" dir="ltr">
  AIMOPS
</span>            </Link>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const label = t(`nav.${item.key}`, {
              defaultValue: item.key,
            });

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive(item.path) ? "active" : ""}`}
              >
                <Icon className="nav-icon" size={20} />
                <span className="nav-text">{label}</span>
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
                <div className="user-name">{userName}</div>
                <div className="user-role">{userRole}</div>
              </div>

              <button
                type="button"
                className="logout-button"
                onClick={handleLogoutClick}
                title={t("layout.logout")}
                aria-label={t("layout.logout")}
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
                <div className="user-name">{userName}</div>
                <div className="user-role">{userRole}</div>
              </div>

              <button
                type="button"
                className="logout-button"
                onClick={handleLogoutClick}
                title={t("layout.logout")}
                aria-label={t("layout.logout")}
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {showLogoutConfirm && (
        <LogoutConfirmModal
          userName={userName}
          onCancel={handleCancelLogout}
          onConfirm={handleConfirmLogout}
        />
      )}
    </>
  );
};

export default AdminSidebar;