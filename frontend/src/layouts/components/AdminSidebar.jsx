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
  const { user, logout, isAdmin } = useAuth();

  const admin = isAdmin?.() || false;

  const menuItems = [
    { title: "Overview", path: "/admin/overview", icon: LayoutDashboard },
    { title: "Campaigns", path: "/admin/campaigns", icon: Megaphone },
    { title: "Feedback", path: "/admin/feedback", icon: MessageSquare },
    { title: "Data Upload", path: "/admin/data-upload", icon: Upload },
    { title: "Audit & Data Quality", path: "/admin/audit", icon: UserCheck },
    { title: "Data Sources", path: "/admin/data-sources", icon: Database },
    { title: "Reports", path: "/admin/reports", icon: FileText },
    ...(admin
      ? [{ title: "User Management", path: "/admin/user-management", icon: Users }]
      : []),
    { title: "Settings", path: "/admin/settings", icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

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
        <Link to="/admin/support" className="nav-item">
          <HelpCircle className="nav-icon" size={20} />
          <span className="nav-text">Support</span>
        </Link>

        {/* Everyone goes to /app/profile */}
        <Link to="/app/profile" className="user-profile" style={{ textDecoration: "none" }}>
          <div className="user-avatar">
            <User size={20} />
          </div>

          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.username || "User"}</div>
            <div className="user-role">{user?.role?.display_name || user?.role_name || "User"}</div>
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
