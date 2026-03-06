// frontend/src/features/dashboard/pages/Overview.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  getDashboardSummary,
  getUploadsForCharts,
  getProductsForCharts,
} from "../../../api/dashboard";
import "./Overview.css";

import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

const BLUE = {
  900: "#0B1F44",
  800: "#0B2E5E",
  700: "#0A3A78",
  600: "#0A4C9A",
  500: "#2563EB",
  400: "#3B82F6",
  300: "#60A5FA",
  200: "#93C5FD",
  150: "#BFDBFE",
  100: "#DBEAFE",
};

const PIE_BLUES = [
  BLUE[700], BLUE[600], BLUE[500], BLUE[400],
  BLUE[300], BLUE[200], BLUE[150],
];

function withAlpha(hex, a = 0.25) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const STATUS_COLOR = {
  completed: BLUE[700],
  processing: BLUE[500],
  mapping: BLUE[400],
  pending: BLUE[200],
  unknown: BLUE[150],
};

const pickDashboard = ({ user, hasPermission }) => {
  const roleName = user?.role?.display_name || user?.role_name || "";
  if (user?.is_admin === true || roleName === "Administrator") return "admin";
  if (roleName === "Business Owner") return "owner";
  if (roleName === "Marketing User") return "marketing";
  if (hasPermission("users.view") || hasPermission("system.settings")) return "admin";
  if (hasPermission("campaigns.view") || hasPermission("feedback.view")) return "marketing";
  return "default";
};

// Stat keys per role — labels come from i18n at render time
const DASH_STATS = {
  admin:     ["usersCount", "uploadsCount", "productsCount", "feedbackCount"],
  marketing: ["uploadsCount", "productsCount", "campaignsCount", "feedbackCount"],
  owner:     ["uploadsCountPeriod", "productsCount", "revenue", "dataQuality"],
  default:   ["uploadsCount", "productsCount", "usersCount", "status"],
};

function safeNumberText(v) {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "—";
}

function formatDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function dayKey(dt) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const lineOptions = {
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
  scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
};

const barOptions = {
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
  scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
};

const doughnutOptions = {
  plugins: { legend: { position: "bottom" }, tooltip: { enabled: true } },
};

export default function Overview() {
  const { t } = useTranslation("dashboard");
  const { user, hasPermission } = useAuth();
  const key = pickDashboard({ user, hasPermission });
  const statKeys = DASH_STATS[key];

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    usersCount: null,
    uploadsCount: null,
    productsCount: null,
    recentUploads: [],
  });
  const [uploads, setUploads] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const [sum, ups, prods] = await Promise.all([
          getDashboardSummary(),
          getUploadsForCharts({ limit: 500 }),
          getProductsForCharts({ limit: 200 }),
        ]);
        if (!alive) return;
        setSummary(sum);
        setUploads(Array.isArray(ups) ? ups : []);
        setProducts(Array.isArray(prods) ? prods : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || t("errorLoadFailed"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, [key]);

  const stats = useMemo(() => {
    const map = {
      usersCount: summary.usersCount,
      uploadsCount: summary.uploadsCount,
      uploadsCountPeriod: summary.uploadsCount,
      productsCount: summary.productsCount,
      feedbackCount: null,
      campaignsCount: null,
      revenue: null,
      dataQuality: null,
      status: null,
    };
    return statKeys.map((k) => ({ key: k, label: t(`stats.${k}`), value: map[k] }));
  }, [statKeys, summary, t]);

  const activity = useMemo(() => {
    const items = [];
    if (Array.isArray(summary.recentUploads) && summary.recentUploads.length > 0) {
      for (const u of summary.recentUploads) {
        const file = u.file_name || u.filename || u.name || "Upload";
        const when = formatDateTime(u.uploaded_at || u.created_at || u.date);
        items.push(when ? `${file} (${when})` : file);
      }
    }
    if (items.length === 0) items.push(t("charts.noRecentUploads"));
    return items.slice(0, 5);
  }, [summary.recentUploads, t]);

  // Chart 1: Uploads by status
  const uploadsByStatus = useMemo(() => {
    const counts = {};
    for (const u of uploads) {
      const s = String(u.status || "unknown").toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    }
    const preferred = ["completed", "processing", "mapping", "pending", "unknown"];
    const rest = Object.keys(counts).filter((k) => !preferred.includes(k)).sort();
    const labels = preferred.filter((k) => counts[k]).concat(rest);
    const data = labels.map((l) => counts[l]);
    const bg = labels.map((l, i) => STATUS_COLOR[l] || PIE_BLUES[i % PIE_BLUES.length]);
    return {
      labels,
      datasets: [{
        label: t("charts.uploadsDatasetLabel"),
        data,
        backgroundColor: bg,
        borderColor: "#ffffff",
        borderWidth: 2,
        hoverOffset: 6,
      }],
    };
  }, [uploads, t]);

  // Chart 2: Uploads per day (last 14 days)
  const uploadsPerDay = useMemo(() => {
    const counts = new Map();
    for (const u of uploads) {
      const k = dayKey(u.uploaded_at);
      if (!k) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const days = Array.from(counts.keys()).sort();
    const last = days.slice(-14);
    return {
      labels: last,
      datasets: [{
        label: t("charts.uploadsDatasetLabel"),
        data: last.map((d) => counts.get(d) || 0),
        borderColor: BLUE[500],
        backgroundColor: withAlpha(BLUE[400], 0.22),
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: BLUE[600],
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      }],
    };
  }, [uploads, t]);

  // Chart 3: Top products by revenue
  const topProductsRevenue = useMemo(() => {
    const list = products
      .map((p) => ({
        name: p.product_name || p.name || "Product",
        revenue: Number.isFinite(Number(p?.stats?.total_revenue ?? 0))
          ? Number(p.stats.total_revenue)
          : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
    return {
      labels: list.map((x) => x.name),
      datasets: [{
        label: t("charts.revenueDatasetLabel"),
        data: list.map((x) => x.revenue),
        backgroundColor: list.map((_, i) => withAlpha(PIE_BLUES[i % PIE_BLUES.length], 0.85)),
        hoverBackgroundColor: list.map((_, i) => PIE_BLUES[i % PIE_BLUES.length]),
        borderColor: withAlpha(BLUE[900], 0.18),
        borderWidth: 1,
        borderRadius: 8,
      }],
    };
  }, [products, t]);

  return (
    <div className="overview-page">
      <PageHeader
        title={t(`roles.${key}.title`)}
        subtitle={t(`roles.${key}.subtitle`)}
      />

      {error ? <div className="overview-error">{error}</div> : null}

      <div className="stats-grid">
        {stats.map((s) => (
          <div className={`stat-card ${loading ? "is-loading" : ""}`} key={s.key}>
            <h3>{s.label}</h3>
            <p className="stat-number">{loading ? "—" : safeNumberText(s.value)}</p>
            <span className="stat-change"> </span>
          </div>
        ))}
      </div>

      <div className="overview-charts-grid">
        <Card title={t("charts.uploadsByStatus")}>
          {uploads.length === 0 ? (
            <div className="chart-empty">
              {loading ? t("charts.loading") : t("charts.noUploads")}
            </div>
          ) : (
            <Doughnut data={uploadsByStatus} options={doughnutOptions} />
          )}
        </Card>

        <Card title={t("charts.uploadsOverTime")}>
          {uploads.length === 0 ? (
            <div className="chart-empty">
              {loading ? t("charts.loading") : t("charts.noUploads")}
            </div>
          ) : (
            <Line data={uploadsPerDay} options={lineOptions} />
          )}
        </Card>

        <Card title={t("charts.topProductsRevenue")}>
          {products.length === 0 ? (
            <div className="chart-empty">
              {loading ? t("charts.loading") : t("charts.noProducts")}
            </div>
          ) : (
            <Bar data={topProductsRevenue} options={barOptions} />
          )}
        </Card>
      </div>

      <Card title={t("charts.recentActivity")}>
        <div className="activity-list">
          {activity.map((text, i) => (
            <div className="activity-item" key={i}>
              <div className="activity-icon">•</div>
              <div className="activity-content">
                <p className="activity-title">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}