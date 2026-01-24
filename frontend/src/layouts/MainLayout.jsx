import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './components/AdminSidebar';
import { Menu } from 'lucide-react';
import './MainLayout.css';

const MainLayout = ({ userRole = 'Admin' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="main-layout">
      <AdminSidebar isOpen={sidebarOpen} />
      
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Header */}
        <header className="app-header">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="menu-button"
          >
            <Menu size={24} />
          </button>
          <h1 className="page-title">Welcome to AIMOPS</h1>
          <div className="header-actions">
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