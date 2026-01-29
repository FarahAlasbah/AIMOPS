// frontend/src/features/dashboard/pages/Overview.jsx
import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import "./Overview.css";

const pickDashboard = ({ user, hasPermission }) => {
  const roleName = user?.role?.display_name || user?.role_name || "";

  // Prefer role if present
  if (user?.is_admin === true || roleName === "Administrator") return "admin";
  if (roleName === "Business Owner") return "owner";
  if (roleName === "Marketing User") return "marketing";

  // Fallback by permission (in case role name changes)
  if (hasPermission("users.view") || hasPermission("system.settings")) return "admin";
  if (hasPermission("campaigns.view") || hasPermission("feedback.view")) return "marketing";

  return "default";
};

const DASH = {
  admin: {
    title: "Admin Dashboard",
    subtitle: "System overview and management",
    stats: [
      { label: "Total Users", value: "—" },
      { label: "Data Quality", value: "—" },
      { label: "Active Campaigns", value: "—" },
      { label: "Feedback Items", value: "—" },
    ],
    activity: [
      "Review user roles and permissions",
      "Check audit & data quality",
      "Review system reports",
    ],
  },
  marketing: {
    title: "Marketing Dashboard",
    subtitle: "Campaigns and feedback performance",
    stats: [
      { label: "Active Campaigns", value: "—" },
      { label: "New Feedback", value: "—" },
      { label: "Positive Sentiment", value: "—" },
      { label: "Data Uploads", value: "—" },
    ],
    activity: [
      "Launch or review campaigns",
      "Upload and analyze feedback",
      "Check campaign performance",
    ],
  },
  owner: {
    title: "Business Owner Dashboard",
    subtitle: "High-level view of operations and results",
    stats: [
      { label: "Revenue (Period)", value: "—" },
      { label: "Forecast Status", value: "—" },
      { label: "Campaign ROI", value: "—" },
      { label: "Data Quality", value: "—" },
    ],
    activity: [
      "Review forecasts and KPIs",
      "Compare campaigns performance",
      "Check data quality trends",
    ],
  },
  default: {
    title: "Dashboard",
    subtitle: "Overview",
    stats: [
      { label: "Status", value: "—" },
      { label: "Notifications", value: "—" },
      { label: "Updates", value: "—" },
      { label: "Tasks", value: "—" },
    ],
    activity: ["Welcome back"],
  },
};

export default function Overview() {
  const { user, hasPermission } = useAuth();
  const key = pickDashboard({ user, hasPermission });
  const cfg = DASH[key];

  return (
    <div className="overview-page">
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} />

      <div className="stats-grid">
        {cfg.stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <h3>{s.label}</h3>
            <p className="stat-number">{s.value}</p>
            <span className="stat-change"> </span>
          </div>
        ))}
      </div>

      <Card title="What you can do next">
        <div className="activity-list">
          {cfg.activity.map((t, i) => (
            <div className="activity-item" key={i}>
              <div className="activity-icon">•</div>
              <div className="activity-content">
                <p className="activity-title">{t}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
