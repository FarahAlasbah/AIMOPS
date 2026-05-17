// frontend/src/App.jsx
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AuthProvider, useAuth } from "./shared/contexts/AuthContext";
import { isAdminUser } from "./shared/permissions/rolePermissions";
import RequirePermission from "./routes/RequirePermission";
import Denied from "./shared/pages/Denied";
import { BusinessProfileProvider } from "./features/business-profile/context/BusinessProfileContext";
import { ConsultationProvider } from "./features/consultation/context/ConsultationProvider";
import ConsultationDrawer from "./features/consultation/components/ConsultationDrawer";
import ConsultationFloatingButton from "./features/consultation/components/ConsultationFloatingButton";
import { applyTheme } from "./shared/theme/themeToCssVars";

const MainLayout = lazy(() => import("./layouts/MainLayout"));
const Login = lazy(() => import("./features/auth/pages/Login"));
const Profile = lazy(() => import("./features/profile/pages/Profile"));
const Overview = lazy(() => import("./features/dashboard/pages/Overview"));
const CampaignList = lazy(() => import("./features/campaigns/pages/CampaignList"));
const NewCampaign = lazy(() => import("./features/campaigns/pages/NewCampaign"));
const CampaignDetails = lazy(() => import("./features/campaigns/pages/CampaignDetails"));
const CampaignCalendar = lazy(() => import("./features/campaigns/pages/CampaignCalendar"));
const DataUpload = lazy(() => import("./features/data-upload/pages/DataUpload"));
const FeedbackList = lazy(() => import("./features/feedback/pages/FeedbackList"));
const FeedbackUpload = lazy(() => import("./features/feedback/pages/FeedbackUpload"));
const UserManagement = lazy(() => import("./features/admin/pages/UserManagement"));
const ActivityHistory = lazy(() => import("./features/admin/pages/ActivityHistory"));
const ProductsPage = lazy(() => import("./features/products/pages/ProductsPage"));
const ForecastingPage = lazy(() => import("./features/forecasting/pages/ForecastingPage"));
const ForecastDetailsPage = lazy(() => import("./features/forecasting/pages/ForecastDetailsPage"));
const EventsPage = lazy(() => import("./features/events/pages/EventsPage"));
const EventDetailsPage = lazy(() => import("./features/events/pages/EventDetailsPage"));
const CalendarPage = lazy(() => import("./features/events/pages/CalendarPage"));
const ConsultationPage = lazy(() => import("./features/consultation/pages/ConsultationPage"));
const BusinessProfilePage = lazy(() => import("./features/business-profile/pages/BusinessProfilePage"));
const ReportsPage = lazy(() => import("./features/reports/pages/ReportsPage"));

const RTL_LANGS = new Set(["ar"]);

function PageFallback() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        color: "#6b7280",
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      Loading...
    </div>
  );
}

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

function RequireAdminOnly({ children }) {
  const { user } = useAuth();

  if (!isAdminUser(user)) {
    return <Denied />;
  }

  return children;
}

function AppShell() {
  return (
    <BusinessProfileProvider>
      <ConsultationProvider>
        <MainLayout />

        <ConsultationDrawer />
        <ConsultationFloatingButton />
      </ConsultationProvider>
    </BusinessProfileProvider>
  );
}

function App() {
  useDirection();
  useTheme();

  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/admin/*" element={<Navigate to="/app/overview" replace />} />

            <Route
              path="/app"
              element={
                <RequirePermission anyOf={["dashboard.view"]} redirectTo="/login">
                  <AppShell />
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
                  <RequirePermission anyOf={["profile.view"]}>
                    <Profile />
                  </RequirePermission>
                }
              />

              <Route
                path="business-profile"
                element={
                  <RequirePermission anyOf={["business_profile.view"]}>
                    <BusinessProfilePage />
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
                path="campaigns/calendar"
                element={
                  <RequirePermission anyOf={["campaigns.view"]}>
                    <CampaignCalendar />
                  </RequirePermission>
                }
              />

              <Route
                path="campaigns/:campaignId"
                element={
                  <RequirePermission anyOf={["campaigns.view"]}>
                    <CampaignDetails />
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
                path="forecasting/:productId"
                element={
                  <RequirePermission anyOf={["forecasts.view"]}>
                    <ForecastDetailsPage />
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
                path="consultation"
                element={
                  <RequirePermission anyOf={["consultation.view"]}>
                    <ConsultationPage />
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
                path="reports"
                element={
                  <RequirePermission anyOf={["reports.view"]}>
                    <ReportsPage />
                  </RequirePermission>
                }
              />

              <Route
                path="activity-history"
                element={
                  <RequireAdminOnly>
                    <ActivityHistory />
                  </RequireAdminOnly>
                }
              />

              <Route
                path="user-management"
                element={
                  <RequirePermission anyOf={["users.view"]}>
                    <RequireAdminOnly>
                      <UserManagement />
                    </RequireAdminOnly>
                  </RequirePermission>
                }
              />

              <Route path="denied" element={<Denied />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;