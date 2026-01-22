import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <h1>AIMOPS</h1>
          <p>AI-driven Marketing and Operations Predicting System</p>
        </div>
        
        <main className="auth-content">
          <Outlet /> {/* Login/Register pages render here */}
        </main>
        
        <footer className="auth-footer">
          <p>© 2025 AIMOPS. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default AuthLayout;