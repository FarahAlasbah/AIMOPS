// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/contexts/AuthContext";
import MainLayout from "./layouts/MainLayout";
import Login from "./features/auth/pages/Login";

import RequirePermission from "./routes/RequirePermission";

// Pages
import Profile from "./features/profile/pages/Profile";

// Shared pages (available depending on permissions)
import Overview from "./features/dashboard/pages/Overview";
import CampaignList from "./features/campaigns/pages/CampaignList";
import NewCampaign from "./features/campaigns/pages/NewCampaign";
import DataUpload from "./features/data-upload/pages/DataUpload";
import FeedbackList from "./features/feedback/pages/FeedbackList";
import FeedbackUpload from "./features/feedback/pages/FeedbackUpload";
import UserManagement from "./features/admin/pages/UserManagement";

import Denied from "./shared/pages/Denied";
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Legacy admin base -> send to /app */}
          <Route
            path="/admin/*"
            element={<Navigate to="/app/overview" replace />}
          />

          {/* All authenticated users live under /app */}
          <Route
            path="/app"
            element={
              <RequirePermission anyOf={["dashboard.view"]} redirectTo="/login">
                <MainLayout />
              </RequirePermission>
            }
          >
            <Route index element={<Navigate to="/app/overview" replace />} />

            {/* Everyone (per your table) */}
            <Route
              path="overview"
              element={
                <RequirePermission anyOf={["dashboard.view"]}>
                  <Overview />
                </RequirePermission>
              }
            />
            <Route
              path="profile"
              element={
                <RequirePermission anyOf={["dashboard.view"]}>
                  <Profile />
                </RequirePermission>
              }
            />

            {/* Campaigns */}
            <Route
              path="campaigns"
              element={
                <RequirePermission anyOf={["campaigns.view"]}>
                  <CampaignList />
                </RequirePermission>
              }
            />
            <Route
              path="campaigns/new"
              element={
                <RequirePermission anyOf={["campaigns.create"]}>
                  <NewCampaign />
                </RequirePermission>
              }
            />

            {/* Feedback */}
            <Route
              path="feedback"
              element={
                <RequirePermission anyOf={["feedback.view"]}>
                  <FeedbackList />
                </RequirePermission>
              }
            />
            <Route
              path="feedback/upload"
              element={
                <RequirePermission anyOf={["feedback.upload"]}>
                  <FeedbackUpload />
                </RequirePermission>
              }
            />

            {/* Data upload */}
            <Route
              path="data-upload"
              element={
                <RequirePermission anyOf={["data.upload"]}>
                  <DataUpload />
                </RequirePermission>
              }
            />

            {/* Admin-only page by permission */}
            <Route
              path="user-management"
              element={
                <RequirePermission anyOf={["users.view"]}>
                  <UserManagement />
                </RequirePermission>
              }
            />
            <Route path="denied" element={<Denied />} />

            {/* Add more routes here the same way:
                reports.view, system.settings, system.audit, forecasts.* etc */}
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
