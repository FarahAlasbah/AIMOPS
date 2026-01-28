// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/contexts/AuthContext";
import MainLayout from "./layouts/MainLayout";
import Login from "./features/auth/pages/Login";

// Pages you already have
import Overview from "./features/dashboard/pages/Overview";
import CampaignList from "./features/campaigns/pages/CampaignList";
import NewCampaign from "./features/campaigns/pages/NewCampaign";
import DataUpload from "./features/data-upload/pages/DataUpload";
import FeedbackList from "./features/feedback/pages/FeedbackList";
import FeedbackUpload from "./features/feedback/pages/FeedbackUpload";
import UserManagement from "./features/admin/pages/UserManagement";

// Small helpers (no extra files)
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user_data") || "null");
  } catch {
    return null;
  }
};

const getRoleCode = (u) => {
  // support multiple shapes (because your UI uses several fields)
  if (!u) return null;
  if (u.is_admin) return "admin";
  return u.role?.role_name || u.role_name || null; // "marketing_user" | "business_owner" | "admin"
};

const defaultPathForRole = (role) => {
  if (role === "admin") return "/admin/overview";
  if (role === "marketing_user") return "/marketing/overview";
  if (role === "business_owner") return "/owner/overview";
  return "/login";
};

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem("auth_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RequireRole = ({ allow, children }) => {
  const token = localStorage.getItem("auth_token");
  if (!token) return <Navigate to="/login" replace />;

  const u = getStoredUser();
  const role = getRoleCode(u);
  if (!role) return <Navigate to="/login" replace />;

  if (!allow.includes(role)) {
    return <Navigate to={defaultPathForRole(role)} replace />;
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

          {/* Root: send logged-in user to their home */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Navigate to={defaultPathForRole(getRoleCode(getStoredUser()))} replace />
              </RequireAuth>
            }
          />

          {/* ADMIN ROUTES (full access) */}
          <Route
            path="/admin"
            element={
              <RequireRole allow={["admin"]}>
                <MainLayout />
              </RequireRole>
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

            <Route path="user-management" element={<UserManagement />} />
            <Route path="support" element={<div><h2>Support</h2></div>} />
          </Route>

          {/* MARKETING USER ROUTES */}
          <Route
            path="/marketing"
            element={
              <RequireRole allow={["marketing_user"]}>
                <MainLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="/marketing/overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="campaigns" element={<CampaignList />} />
            <Route path="campaigns/new" element={<NewCampaign />} />
            <Route path="feedback" element={<FeedbackList />} />
            <Route path="feedback/upload" element={<FeedbackUpload />} />
            <Route path="data-upload" element={<DataUpload />} />
            <Route path="reports" element={<div><h2>Reports</h2></div>} />
            <Route path="support" element={<div><h2>Support</h2></div>} />
          </Route>

          {/* BUSINESS OWNER ROUTES (view only) */}
          <Route
            path="/owner"
            element={
              <RequireRole allow={["business_owner"]}>
                <MainLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="/owner/overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="campaigns" element={<CampaignList />} />
            <Route path="feedback" element={<FeedbackList />} />
            <Route path="reports" element={<div><h2>Reports</h2></div>} />
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
