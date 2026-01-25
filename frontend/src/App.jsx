// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './features/auth/pages/Login';
import Signup from './features/auth/pages/Signup';

// Layouts
import MainLayout from './layouts/MainLayout'; // Admin Layout
import MarketingLayout from './layouts/MarketingLayout';
import OwnerLayout from './layouts/OwnerLayout';

// Pages (Reusing components where permissions allow)
import Overview from './features/dashboard/pages/Overview';
import CampaignList from './features/campaigns/pages/CampaignList';
import FeedbackList from './features/feedback/pages/FeedbackList';
import DataUpload from './features/data-upload/pages/DataUpload';
// Note: You would create specific "View Only" versions of pages for the Owner if needed, 
// or pass a prop like <CampaignList readOnly={true} />

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 1. ADMIN DASHBOARD (Full Access) */}
        <Route path="/admin" element={<MainLayout />}>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="feedback" element={<FeedbackList />} />
          <Route path="data-upload" element={<DataUpload />} />
          {/* Admin specific pages */}
          <Route path="audit" element={<div><h2>Audit Logs</h2></div>} />
          <Route path="settings" element={<div><h2>System Settings</h2></div>} />
        </Route>

        {/* 2. MARKETING DASHBOARD (Create/Edit Access) */}
        <Route path="/marketing" element={<MarketingLayout />}>
          <Route index element={<Navigate to="/marketing/dashboard" replace />} />
          <Route path="dashboard" element={<Overview role="marketing" />} />
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="data-upload" element={<DataUpload />} />
          <Route path="feedback" element={<FeedbackList />} />
          <Route path="forecasting" element={<div><h2>Forecasting Tool</h2></div>} />
          <Route path="reports" element={<div><h2>Marketing Reports</h2></div>} />
        </Route>

        {/* 3. BUSINESS OWNER DASHBOARD (Read Only Access) */}
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="dashboard" element={<Overview role="owner" />} />
          {/* Reuse lists but logic inside should hide "Create" buttons */}
          <Route path="campaigns" element={<CampaignList readOnly={true} />} />
          <Route path="feedback" element={<FeedbackList readOnly={true} />} />
          <Route path="forecasting" element={<div><h2>Forecast Results</h2></div>} />
          <Route path="reports" element={<div><h2>Executive Reports</h2></div>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;