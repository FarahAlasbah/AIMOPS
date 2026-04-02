// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/contexts/AuthContext";
import MainLayout from "./layouts/MainLayout";
import Login from "./features/auth/pages/Login";
import RequirePermission from "./routes/RequirePermission";

import Profile from "./features/profile/pages/Profile";
import Overview from "./features/dashboard/pages/Overview";
import CampaignList from "./features/campaigns/pages/CampaignList";
import NewCampaign from "./features/campaigns/pages/NewCampaign";
import DataUpload from "./features/data-upload/pages/DataUpload";
import FeedbackList from "./features/feedback/pages/FeedbackList";
import FeedbackUpload from "./features/feedback/pages/FeedbackUpload";
import UserManagement from "./features/admin/pages/UserManagement";
import Denied from "./shared/pages/Denied";

import ProductsPage from "./features/products/pages/ProductsPage";
import ForecastingPage from "./features/forecasting/pages/ForecastingPage";

import EventsPage from "./features/events/pages/EventsPage";
import EventDetailsPage from "./features/events/pages/EventDetailsPage";
import CalendarPage from "./features/events/pages/CalendarPage";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applyTheme } from "./shared/theme/themeToCssVars";

const RTL_LANGS = new Set(["ar"]);

function useDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lng = i18n.language?.startsWith("ar") ? "ar" : "en";
    const dir = RTL_LANGS.has(lng) ? "rtl" : "ltr";

    document.documentElement.lang = lng;
    document.documentElement.dir = dir;
  }, [i18n.language]);
}

function useTheme() {
  useEffect(() => {
    applyTheme();
  }, []);
}

function App() {
  useDirection();
  useTheme();

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/admin/*" element={<Navigate to="/app/overview" replace />} />

          <Route
            path="/app"
            element={
              <RequirePermission anyOf={["dashboard.view"]} redirectTo="/login">
                <MainLayout />
              </RequirePermission>
            }
          >
            <Route index element={<Navigate to="/app/overview" replace />} />

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

            <Route
              path="data-upload/*"
              element={
                <RequirePermission anyOf={["data.upload"]}>
                  <DataUpload />
                </RequirePermission>
              }
            />

            <Route
              path="forecasting"
              element={
                <RequirePermission anyOf={["forecasts.view"]}>
                  <ForecastingPage />
                </RequirePermission>
              }
            />

            <Route
              path="products"
              element={
                <RequirePermission anyOf={["products.view"]}>
                  <ProductsPage />
                </RequirePermission>
              }
            />

            <Route
              path="events"
              element={
                <RequirePermission anyOf={["events.view"]}>
                  <EventsPage />
                </RequirePermission>
              }
            />
            <Route
              path="events/:eventId"
              element={
                <RequirePermission anyOf={["events.view_detail"]}>
                  <EventDetailsPage />
                </RequirePermission>
              }
            />
            <Route
              path="calendar"
              element={
                <RequirePermission anyOf={["calendar.view"]}>
                  <CalendarPage />
                </RequirePermission>
              }
            />

            <Route
              path="user-management"
              element={
                <RequirePermission anyOf={["users.view"]}>
                  <UserManagement />
                </RequirePermission>
              }
            />

            <Route path="denied" element={<Denied />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;