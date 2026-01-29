// frontend/src/layouts/components/AdminSidebar.jsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/contexts/AuthContext";
import {
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Upload,
  UserCheck,
  Database,
  FileText,
  Settings,
  HelpCircle,
  User,
  LogOut,
  Users,
} from "lucide-react";
import "./AdminSidebar.css";

const AdminSidebar = ({ isOpen }) => {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const isActive = (path) => location.pathname === path;

  // One menu list, filtered by permissions
  const menuItems = [
    { title: "Overview", path: "/app/overview", icon: LayoutDashboard, perm: "dashboard.view" },

    { title: "Campaigns", path: "/app/campaigns", icon: Megaphone, perm: "campaigns.view" },
    // Optional: you can hide "new" from sidebar and show it as a button inside CampaignList instead
    // { title: "New Campaign", path: "/app/campaigns/new", icon: Megaphone, perm: "campaigns.create" },

    { title: "Feedback", path: "/app/feedback", icon: MessageSquare, perm: "feedback.view" },
    // { title: "Feedback Upload", path: "/app/feedback/upload", icon: Upload, perm: "feedback.upload" },

    { title: "Data Upload", path: "/app/data-upload", icon: Upload, perm: "data.upload" },

    // If you actually have these pages, guard them by system.* (admin-only)
    { title: "Audit & Data Quality", path: "/app/audit", icon: UserCheck, perm: "system.audit" },
    { title: "Data Sources", path: "/app/data-sources", icon: Database, perm: "system.settings" },
    { title: "Reports", path: "/app/reports", icon: FileText, perm: "reports.view" },
    { title: "Settings", path: "/app/settings", icon: Settings, perm: "system.settings" },

    { title: "User Management", path: "/app/user-management", icon: Users, perm: "users.view" },
  ].filter((item) => hasPermission(item.perm));

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon"></div>
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
              <span className="nav-text">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Link to="/app/support" className="nav-item">
          <HelpCircle className="nav-icon" size={20} />
          <span className="nav-text">Support</span>
        </Link>

        <Link
          to="/app/profile"
          className="user-profile"
          style={{ textDecoration: "none" }}
        >
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
            onClick={(e) => {
              e.preventDefault();
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
