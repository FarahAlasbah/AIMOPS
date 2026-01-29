// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './features/auth/pages/Login';

import Profile from './features/profile/pages/Profile';

// Admin pages
import Overview from './features/dashboard/pages/Overview';
import CampaignList from './features/campaigns/pages/CampaignList';
import NewCampaign from './features/campaigns/pages/NewCampaign';
import DataUpload from './features/data-upload/pages/DataUpload';
import FeedbackList from './features/feedback/pages/FeedbackList';
import FeedbackUpload from './features/feedback/pages/FeedbackUpload';
import UserManagement from './features/admin/pages/UserManagement';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// Optional: simple role guard for admin routes
const AdminOnly = ({ children }) => {
  const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
  const isAdmin = userData?.is_admin || userData?.role_name === 'admin' || userData?.role === 'admin';
  if (!isAdmin) return <Navigate to="/app/profile" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ALL USERS */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/profile" replace />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* ADMIN ONLY */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminOnly>
                  <MainLayout />
                </AdminOnly>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="campaigns" element={<CampaignList />} />
            <Route path="campaigns/new" element={<NewCampaign />} />
            <Route path="feedback" element={<FeedbackList />} />
            <Route path="feedback/upload" element={<FeedbackUpload />} />
            <Route path="data-upload" element={<DataUpload />} />
            <Route path="user-management" element={<UserManagement />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
