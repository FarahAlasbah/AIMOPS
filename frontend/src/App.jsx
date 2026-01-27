import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './features/auth/pages/Login';

// Import other pages
import Overview from './features/dashboard/pages/Overview';
import CampaignList from './features/campaigns/pages/CampaignList';
import NewCampaign from './features/campaigns/pages/NewCampaign';
import DataUpload from './features/data-upload/pages/DataUpload';
import FeedbackList from './features/feedback/pages/FeedbackList';
import FeedbackUpload from './features/feedback/pages/FeedbackUpload';
import UserManagement from './features/admin/pages/UserManagement'; // Add this

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Protected Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <MainLayout />
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

            <Route path="audit" element={<div><h2>Audit & Data Quality</h2></div>} />
            <Route path="data-sources" element={<div><h2>Data Sources</h2></div>} />
            <Route path="reports" element={<div><h2>Reports</h2></div>} />
            <Route path="settings" element={<div><h2>Settings</h2></div>} />
                        <Route path="user-management" element={<UserManagement />} /> {/* Add this */}

            <Route path="support" element={<div><h2>Support</h2></div>} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
