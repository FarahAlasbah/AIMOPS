import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  
  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: '📊' },
    { title: 'Campaigns', path: '/campaigns', icon: '📢' },
    { title: 'Data Upload', path: '/data-upload', icon: '📤' },
    { title: 'Forecasting', path: '/forecasting', icon: '📈' },
    { title: 'Feedback', path: '/feedback', icon: '💬' },
    { title: 'Events', path: '/events', icon: '📅' },
    { title: 'Reports', path: '/reports', icon: '📋' },
    { title: 'Admin', path: '/admin', icon: '⚙️' }
  ];

  return (
    <aside style={{
      width: isOpen ? '250px' : '0',
      height: '100vh',
      backgroundColor: '#2c3e50',
      color: 'white',
      position: 'fixed',
      left: 0,
      top: 0,
      transition: 'width 0.3s ease',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '20px' }}>
        <h2 style={{ margin: '0 0 30px 0', fontSize: '24px' }}>AIMOPS</h2>
        
        <nav>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                margin: '4px 0',
                textDecoration: 'none',
                color: 'white',
                backgroundColor: location.pathname === item.path ? '#34495e' : 'transparent',
                borderRadius: '8px',
                transition: 'background-color 0.2s'
              }}
            >
              <span style={{ marginRight: '12px', fontSize: '20px' }}>
                {item.icon}
              </span>
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;