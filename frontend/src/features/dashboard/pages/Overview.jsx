import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactApexChart from "react-apexcharts";
import { Package, Upload, Megaphone, TrendingUp, Clock3, CheckCircle2 } from "lucide-react";
import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  getDashboardSummary,
  getUploadsForCharts,
  getProductsForCharts,
  getCampaignsForDashboard,
  getForecastSummaryForDashboard,
} from "../../../api/dashboard";
import "./Overview.css";

const pickDashboard = ({ user, hasPermission }) => {
  const roleName = user?.role?.display_name || user?.role_name || "";

  if (user?.is_admin === true || roleName === "Administrator") return "admin";
  if (roleName === "Business Owner") return "owner";
  if (roleName === "Marketing User") return "marketing";

  if (hasPermission?.("users.view") || hasPermission?.("system.settings")) return "admin";
  if (hasPermission?.("campaigns.view") || hasPermission?.("feedback.view")) return "marketing";

  return "default";
};

const STATUS_ORDER = ["processed", "mapping", "pending", "failed", "unknown"];
const STATUS_LABEL_KEY = {
  processed: "statusLabels.processed",
  mapping: "statusLabels.mapping",
  pending: "statusLabels.pending",
  failed: "statusLabels.failed",
  unknown: "statusLabels.unknown",
};

const FORECAST_STATUS_ORDER = ["ready", "training", "failed", "idle"];
const FORECAST_STATUS_LABEL_KEY = {
  ready: "forecastStatus.ready",
  training: "forecastStatus.training",
  failed: "forecastStatus.failed",
  idle: "forecastStatus.idle",
};

function normalizeUploadStatus(value) {
  const v = String(value || "").trim().toLowerCase();
  if (["processed", "done", "success", "completed", "confirmed", "imported"].includes(v)) return "processed";
  if (["mapping"].includes(v)) return "mapping";
  if (["pending", "uploaded", "processing"].includes(v)) return "pending";
  if (["failed", "error", "rejected"].includes(v)) return "failed";
  return "unknown";
}

function formatNumber(value, locale = "en") {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(n);
}

function formatCompactNumber(value, locale = "en") {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatDateTime(dt, locale = "en") {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(dt) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shortDayLabel(dt, locale = "en") {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt || "");
  return d.toLocaleDateString(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
  });
}

export default function Overview() {
  const { t, i18n } = useTranslation("dashboard");
  const { user, hasPermission } = useAuth();
  const dashboardKey = pickDashboard({ user, hasPermission });
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState({
    usersCount: null,
    uploadsCount: null,
    productsCount: null,
    recentUploads: [],
  });

  const [uploads, setUploads] = useState([]);
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [forecastSummary, setForecastSummary] = useState({
    total: 0,
    ready: 0,
    training: 0,
    failed: 0,
    idle: 0,
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const [sum, ups, prods, campaignList, forecastData] = await Promise.all([
          getDashboardSummary(),
          getUploadsForCharts({ limit: 500 }),
          getProductsForCharts({ limit: 200 }),
          getCampaignsForDashboard(),
          getForecastSummaryForDashboard(),
        ]);

        if (!alive) return;

        setSummary(sum || {});
        setUploads(Array.isArray(ups) ? ups : []);
        setProducts(Array.isArray(prods) ? prods : []);
        setCampaigns(Array.isArray(campaignList) ? campaignList : []);
        setForecastSummary(
          forecastData || {
            total: 0,
            ready: 0,
            training: 0,
            failed: 0,
            idle: 0,
          }
        );
      } catch (e) {
        if (!alive) return;
        setError(e?.message || t("errorLoadFailed"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [t]);

  const campaignStats = useMemo(() => {
    const stats = {
      total: campaigns.length,
      active: 0,
      planned: 0,
      completed: 0,
    };

    campaigns.forEach((campaign) => {
      const status = String(campaign?.status || "").toLowerCase();
      if (status === "active") stats.active += 1;
      else if (status === "planned") stats.planned += 1;
      else if (status === "completed") stats.completed += 1;
    });

    return stats;
  }, [campaigns]);

  const uploadStatusStats = useMemo(() => {
    const counts = {
      processed: 0,
      mapping: 0,
      pending: 0,
      failed: 0,
      unknown: 0,
    };

    uploads.forEach((item) => {
      counts[normalizeUploadStatus(item?.status)] += 1;
    });

    return counts;
  }, [uploads]);

  const topStats = useMemo(() => {
    return [
      {
        key: "uploads",
        label: t("stats.uploadsCount"),
        value: summary?.uploadsCount,
        icon: Upload,
        tone: "blue",
        helper: t("helpers.uploadsHelper"),
      },
      {
        key: "products",
        label: t("stats.productsCount"),
        value: summary?.productsCount,
        icon: Package,
        tone: "indigo",
        helper: t("helpers.productsHelper"),
      },
      {
        key: "campaigns",
        label: t("stats.campaignsCount"),
        value: campaignStats.total,
        icon: Megaphone,
        tone: "violet",
        helper: t("helpers.campaignsHelper", { active: campaignStats.active }),
      },
      {
        key: "forecasts",
        label: t("stats.forecastsReady"),
        value: forecastSummary.ready,
        icon: TrendingUp,
        tone: "emerald",
        helper: t("helpers.forecastsHelper", { total: forecastSummary.total }),
      },
    ];
  }, [summary, campaignStats, forecastSummary, t]);

  const uploadsByStatusSeries = useMemo(() => {
    return STATUS_ORDER.map((key) => uploadStatusStats[key] || 0);
  }, [uploadStatusStats]);

  const uploadsByStatusOptions = useMemo(() => {
    return {
      chart: {
        type: "donut",
        toolbar: { show: false },
      },
      labels: STATUS_ORDER.map((key) => t(STATUS_LABEL_KEY[key])),
      legend: {
        position: "bottom",
        fontSize: "13px",
        itemMargin: { horizontal: 10, vertical: 6 },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 0,
      },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: {
                show: true,
                label: t("charts.total"),
                formatter: () => formatNumber(uploads.length, locale),
              },
            },
          },
        },
      },
      colors: ["#1d4ed8", "#3b82f6", "#93c5fd", "#ef4444", "#cbd5e1"],
      tooltip: {
        y: {
          formatter: (value) => formatNumber(value, locale),
        },
      },
    };
  }, [uploads.length, locale, t]);

  const uploadsOverTime = useMemo(() => {
    const map = new Map();

    uploads.forEach((item) => {
      const key = dayKey(item?.uploaded_at || item?.uploadedAt);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });

    const sortedKeys = Array.from(map.keys()).sort().slice(-14);

    return {
      categories: sortedKeys.map((key) => shortDayLabel(key, locale)),
      values: sortedKeys.map((key) => map.get(key) || 0),
    };
  }, [uploads, locale]);

  const uploadsOverTimeOptions = useMemo(() => {
    return {
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.26,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      colors: ["#2563eb"],
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: uploadsOverTime.categories,
        labels: {
          style: { fontSize: "12px" },
        },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (value) => formatNumber(value, locale),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatNumber(value, locale),
        },
      },
    };
  }, [uploadsOverTime.categories, locale]);

  const topProductsRevenue = useMemo(() => {
    const list = products
      .map((product) => ({
        name: product?.product_name || product?.name || t("labels.unnamedProduct"),
        revenue: Number(product?.stats?.total_revenue ?? 0) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return {
      labels: list.map((item) => item.name),
      values: list.map((item) => item.revenue),
    };
  }, [products, t]);

  const topProductsRevenueOptions = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: true,
          barHeight: "52%",
        },
      },
      colors: ["#0f3d91"],
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: topProductsRevenue.labels,
        labels: {
          formatter: (value) => formatCompactNumber(value, locale),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatNumber(value, locale),
        },
      },
    };
  }, [topProductsRevenue.labels, locale]);

  const forecastStatusOptions = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          borderRadius: 10,
          columnWidth: "42%",
        },
      },
      colors: ["#1d4ed8"],
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: FORECAST_STATUS_ORDER.map((key) => t(FORECAST_STATUS_LABEL_KEY[key])),
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (value) => formatNumber(value, locale),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatNumber(value, locale),
        },
      },
    };
  }, [locale, t]);

  const forecastStatusSeries = useMemo(() => {
    return [
      {
        name: t("charts.forecastDatasetLabel"),
        data: FORECAST_STATUS_ORDER.map((key) => forecastSummary?.[key] || 0),
      },
    ];
  }, [forecastSummary, t]);

  const recentActivity = useMemo(() => {
    const items = [];

    (summary?.recentUploads || []).forEach((upload) => {
      const fileName =
        upload?.file_name || upload?.filename || upload?.name || t("labels.uploadFile");
      const when = formatDateTime(upload?.uploaded_at || upload?.created_at || upload?.date, locale);

      items.push({
        title: fileName,
        meta: when,
        badge: t(STATUS_LABEL_KEY[normalizeUploadStatus(upload?.status)]),
      });
    });

    return items.slice(0, 5);
  }, [summary, locale, t]);

  return (
    <div className="overview-page">
      <PageHeader title={t(`roles.${dashboardKey}.title`)} subtitle={t(`roles.${dashboardKey}.subtitle`)} />

      {error ? <div className="overview-error">{error}</div> : null}

      <div className="overview-top-grid">
        {topStats.map((item) => {
          const Icon = item.icon;

          return (
            <div className={`overview-stat-card tone-${item.tone}`} key={item.key}>
              <div className="overview-stat-top">
                <div>
                  <div className="overview-stat-label">{item.label}</div>
                  <div className="overview-stat-value">
                    {loading ? "—" : formatNumber(item.value, locale)}
                  </div>
                </div>

                <div className="overview-stat-icon">
                  <Icon size={20} />
                </div>
              </div>

              <div className="overview-stat-helper">{item.helper}</div>
            </div>
          );
        })}
      </div>

      <div className="overview-main-grid">
        <Card title={t("charts.uploadsOverTime")}>
          <div className="chart-shell large">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : uploadsOverTime.values.length ? (
              <ReactApexChart
                type="area"
                height={320}
                options={uploadsOverTimeOptions}
                series={[
                  {
                    name: t("charts.uploadsDatasetLabel"),
                    data: uploadsOverTime.values,
                  },
                ]}
              />
            ) : (
              <div className="chart-empty">{t("charts.noUploads")}</div>
            )}
          </div>
        </Card>

        <Card title={t("charts.uploadsByStatus")}>
          <div className="chart-shell large">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : uploads.length ? (
              <ReactApexChart
                type="donut"
                height={320}
                options={uploadsByStatusOptions}
                series={uploadsByStatusSeries}
              />
            ) : (
              <div className="chart-empty">{t("charts.noUploads")}</div>
            )}
          </div>
        </Card>
      </div>

      <div className="overview-secondary-grid">
        <Card title={t("charts.topProductsRevenue")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : topProductsRevenue.values.length ? (
              <ReactApexChart
                type="bar"
                height={300}
                options={topProductsRevenueOptions}
                series={[
                  {
                    name: t("charts.revenueDatasetLabel"),
                    data: topProductsRevenue.values,
                  },
                ]}
              />
            ) : (
              <div className="chart-empty">{t("charts.noProducts")}</div>
            )}
          </div>
        </Card>

        <Card title={t("charts.forecastStatus")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : forecastSummary.total > 0 ? (
              <ReactApexChart
                type="bar"
                height={300}
                options={forecastStatusOptions}
                series={forecastStatusSeries}
              />
            ) : (
              <div className="chart-empty">{t("charts.noForecasts")}</div>
            )}
          </div>
        </Card>
      </div>

      <Card title={t("charts.recentActivity")}>
        <div className="activity-list">
          {loading ? (
            <div className="chart-empty compact">{t("charts.loading")}</div>
          ) : recentActivity.length ? (
            recentActivity.map((item, index) => (
              <div className="activity-item" key={`${item.title}-${index}`}>
                <div className="activity-item-icon">
                  <Clock3 size={18} />
                </div>

                <div className="activity-item-body">
                  <div className="activity-item-title">{item.title}</div>
                  <div className="activity-item-meta">{item.meta || "—"}</div>
                </div>

                <div className="activity-item-badge">
                  <CheckCircle2 size={14} />
                  <span>{item.badge}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="chart-empty compact">{t("charts.noRecentUploads")}</div>
          )}
        </div>
      </Card>
    </div>
  );
}