import { Link, useLocation } from 'react-router-dom';
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
  User
} from 'lucide-react';
import './AdminSidebar.css';

const AdminSidebar = ({ isOpen }) => {
  const location = useLocation();
  
  const menuItems = [
    { title: 'Overview', path: '/admin/overview', icon: LayoutDashboard },
    { title: 'Campaigns', path: '/admin/campaigns', icon: Megaphone },
    { title: 'Feedback', path: '/admin/feedback', icon: MessageSquare },
    { title: 'Data Upload', path: '/admin/data-upload', icon: Upload },
    { title: 'Audit & Data Quality', path: '/admin/audit', icon: UserCheck },
    { title: 'Data Sources', path: '/admin/data-sources', icon: Database },
    { title: 'Reports', path: '/admin/reports', icon: FileText },
    { title: 'Settings', path: '/admin/settings', icon: Settings }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Logo/Brand */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon"></div>
          <span className="brand-text">AIMOPS</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={20} />
              <span className="nav-text">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="sidebar-footer">
        <Link to="/admin/support" className="nav-item">
          <HelpCircle className="nav-icon" size={20} />
          <span className="nav-text">Support</span>
        </Link>

        <div className="user-profile">
          <div className="user-avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <div className="user-name">Shahd</div>
            <div className="user-role">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;