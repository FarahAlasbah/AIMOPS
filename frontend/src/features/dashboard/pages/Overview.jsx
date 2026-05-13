import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactApexChart from "react-apexcharts";
import {
  CheckCircle2,
  Clock3,
  Megaphone,
  Package,
  TrendingUp,
  Upload,
} from "lucide-react";
import { getDateRangeFromPeriod } from "../../reports/utils/reportUtils";
import { getDashboardReport } from "../../../api/reports";
import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  getCampaignsForDashboard,
  getDashboardSummary,
  getForecastSummaryForDashboard,
  getProductsForCharts,
  getUploadsForCharts,
} from "../../../api/dashboard";
import BusinessProfileOverviewPanel from "../../business-profile/components/BusinessProfileOverviewPanel";

import "./Overview.css";

const CHART_COLORS = {
  navy: "#03045e",
  blue: "#2563eb",
  indigo: "#4f46e5",
  violet: "#7c3aed",
  emerald: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  slate: "#64748b",
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

const CAMPAIGN_STATUS_ORDER = [
  "active",
  "planned",
  "completed",
  "draft",
  "other",
];

const CAMPAIGN_STATUS_LABEL_KEY = {
  active: "campaignStatus.active",
  planned: "campaignStatus.planned",
  completed: "campaignStatus.completed",
  draft: "campaignStatus.draft",
  other: "campaignStatus.other",
};

function pickDashboard({ user, hasPermission }) {
  const roleName = user?.role?.display_name || user?.role_name || "";

  if (user?.is_admin === true || roleName === "Administrator") return "admin";
  if (roleName === "Business Owner") return "owner";
  if (roleName === "Marketing User") return "marketing";

  if (hasPermission?.("users.view") || hasPermission?.("system.settings")) {
    return "admin";
  }

  if (hasPermission?.("campaigns.view") || hasPermission?.("feedback.view")) {
    return "marketing";
  }

  return "default";
}

function toNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback;

  const cleaned =
    typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeUploadStatus(value) {
  const v = String(value || "").trim().toLowerCase();

  if (
    [
      "processed",
      "done",
      "success",
      "completed",
      "confirmed",
      "imported",
    ].includes(v)
  ) {
    return "processed";
  }

  if (["mapping", "needs_mapping", "needs mapping"].includes(v)) {
    return "mapping";
  }

  if (["pending", "uploaded", "processing"].includes(v)) {
    return "pending";
  }

  if (["failed", "error", "rejected"].includes(v)) {
    return "failed";
  }

  return "unknown";
}

function normalizeCampaignStatus(value) {
  const v = String(value || "").trim().toLowerCase().replaceAll("_", "-");

  if (["active", "running", "ongoing", "in-progress"].includes(v)) {
    return "active";
  }

  if (["planned", "scheduled", "upcoming"].includes(v)) {
    return "planned";
  }

  if (["completed", "done", "finished"].includes(v)) {
    return "completed";
  }

  if (["draft", "pending"].includes(v)) {
    return "draft";
  }

  return "other";
}

function formatNumber(value, locale = "en") {
  const number = toNumber(value, NaN);
  if (!Number.isFinite(number)) return "—";

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(number);
}

function formatCompactNumber(value, locale = "en") {
  const number = toNumber(value, NaN);
  if (!Number.isFinite(number)) return "—";

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

function formatCurrency(value, locale = "en") {
  const number = toNumber(value, 0);

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatPercent(value, locale = "en") {
  const number = toNumber(value, NaN);
  if (!Number.isFinite(number)) return "—";

  return `${new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    maximumFractionDigits: 1,
  }).format(number)}%`;
}

function formatDateTime(value, locale = "en") {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shortDayLabel(value, locale = "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");

  return date.toLocaleDateString(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
  });
}

function getProductName(product, fallback) {
  return product?.product_name || product?.name || fallback;
}

function getProductRevenue(product) {
  return toNumber(
    product?.total_revenue ??
      product?.stats?.total_revenue ??
      product?.revenue,
    0,
  );
}

function getCampaignName(campaign, fallback) {
  return campaign?.campaign_name || campaign?.name || campaign?.title || fallback;
}

function getCampaignBudget(campaign) {
  return toNumber(campaign?.budget ?? campaign?.total_budget, 0);
}

function getCampaignRevenue(campaign) {
  return toNumber(
    campaign?.forecast_additional_revenue ??
      campaign?.additional_revenue ??
      campaign?.expected_revenue ??
      campaign?.predicted_revenue ??
      campaign?.revenue ??
      campaign?.total_revenue,
    0,
  );
}

function getCampaignRoi(campaign) {
  return toNumber(
    campaign?.predicted_roi ??
      campaign?.estimated_roi ??
      campaign?.roi ??
      campaign?.expected_roi,
    0,
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function Overview() {
  const { t, i18n } = useTranslation("dashboard");
  const { user, hasPermission } = useAuth();
  const dashboardKey = pickDashboard({ user, hasPermission });
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);

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
        const dashboardReportRange = getDateRangeFromPeriod("all");
        const [
          summaryResult,
          uploadsResult,
          productsResult,
          campaignsResult,
          forecastResult,
          reportsResult,
        ] = await Promise.allSettled([
          getDashboardSummary(),
          getUploadsForCharts({ limit: 500 }),
          getProductsForCharts({ limit: 200 }),
          getCampaignsForDashboard(),
          getForecastSummaryForDashboard(),
          getDashboardReport({ range: dashboardReportRange }),
        ]);

        if (!alive) return;

        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value || {});
        } else {
          setSummary({});
        }

        if (uploadsResult.status === "fulfilled") {
          setUploads(
            Array.isArray(uploadsResult.value) ? uploadsResult.value : [],
          );
        } else {
          setUploads([]);
        }

        if (productsResult.status === "fulfilled") {
          setProducts(
            Array.isArray(productsResult.value) ? productsResult.value : [],
          );
        } else {
          setProducts([]);
        }

        if (campaignsResult.status === "fulfilled") {
          setCampaigns(
            Array.isArray(campaignsResult.value)
              ? campaignsResult.value
              : [],
          );
        } else {
          setCampaigns([]);
        }

        if (forecastResult.status === "fulfilled") {
          setForecastSummary(
            forecastResult.value || {
              total: 0,
              ready: 0,
              training: 0,
              failed: 0,
              idle: 0,
            },
          );
        } else {
          setForecastSummary({
            total: 0,
            ready: 0,
            training: 0,
            failed: 0,
            idle: 0,
          });
        }

        if (reportsResult.status === "fulfilled") {
          setReportData(reportsResult.value || null);
        } else {
          setReportData(null);
        }

        const mainFailed =
          summaryResult.status === "rejected" &&
          uploadsResult.status === "rejected" &&
          productsResult.status === "rejected" &&
          campaignsResult.status === "rejected" &&
          forecastResult.status === "rejected" &&
          reportsResult.status === "rejected";

        if (mainFailed) {
          throw summaryResult.reason;
        }
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
      draft: 0,
      other: 0,
    };

    campaigns.forEach((campaign) => {
      stats[normalizeCampaignStatus(campaign?.status)] += 1;
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
        fontFamily: "inherit",
        animations: {
          enabled: true,
          speed: 650,
        },
      },
      colors: [CHART_COLORS.blue],
      stroke: {
        curve: "smooth",
        width: 3,
      },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.3,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      markers: {
        size: 4,
        strokeWidth: 2,
        hover: {
          size: 6,
        },
      },
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

  const uploadsByStatusSeries = useMemo(() => {
    return STATUS_ORDER.map((key) => uploadStatusStats[key] || 0);
  }, [uploadStatusStats]);

  const uploadsByStatusOptions = useMemo(() => {
    return {
      chart: {
        type: "donut",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: [
        CHART_COLORS.emerald,
        CHART_COLORS.indigo,
        CHART_COLORS.amber,
        CHART_COLORS.red,
        CHART_COLORS.slate,
      ],
      labels: STATUS_ORDER.map((key) => t(STATUS_LABEL_KEY[key])),
      dataLabels: { enabled: false },
      legend: {
        position: "bottom",
        fontSize: "13px",
        itemMargin: { horizontal: 10, vertical: 6 },
      },
      stroke: {
        width: 0,
      },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
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
      tooltip: {
        y: {
          formatter: (value) => formatNumber(value, locale),
        },
      },
    };
  }, [uploads.length, locale, t, uploadStatusStats]);

  const productRevenueData = useMemo(() => {
    const reportProducts = Array.isArray(reportData?.top_products)
      ? reportData.top_products
      : [];

    const source = reportProducts.length ? reportProducts : products;

    return source
      .map((product) => ({
        name: getProductName(product, t("labels.unnamedProduct")),
        revenue: getProductRevenue(product),
      }))
      .filter((item) => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [reportData, products, t]);

  const productRevenueRankOptions = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
        animations: {
          enabled: true,
          speed: 650,
        },
      },
      colors: [CHART_COLORS.navy],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 8,
          barHeight: "48%",
        },
      },
      dataLabels: {
        enabled: false,
      },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
        padding: {
          right: 18,
          left: 8,
        },
      },
      xaxis: {
        categories: productRevenueData.map((item) => item.name),
        labels: {
          formatter: (value) => formatCompactNumber(value, locale),
          style: {
            colors: "#6b7280",
            fontSize: "12px",
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          maxWidth: 180,
          style: {
            colors: "#111827",
            fontSize: "13px",
            fontWeight: 750,
          },
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatCurrency(value, locale),
        },
      },
    };
  }, [productRevenueData, locale]);

  const forecastRadialSeries = useMemo(() => {
    const total = Math.max(toNumber(forecastSummary.total, 0), 1);

    return FORECAST_STATUS_ORDER.map((key) =>
      Math.round((toNumber(forecastSummary?.[key], 0) / total) * 100),
    );
  }, [forecastSummary]);

  const forecastRadialOptions = useMemo(() => {
    return {
      chart: {
        type: "radialBar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: [
        CHART_COLORS.emerald,
        CHART_COLORS.blue,
        CHART_COLORS.red,
        CHART_COLORS.slate,
      ],
      labels: FORECAST_STATUS_ORDER.map((key) =>
        t(FORECAST_STATUS_LABEL_KEY[key]),
      ),
      plotOptions: {
        radialBar: {
          hollow: {
            size: "34%",
          },
          track: {
            background: "#eef2f7",
            margin: 7,
          },
          dataLabels: {
            name: {
              fontSize: "13px",
              fontWeight: 800,
            },
            value: {
              fontSize: "16px",
              fontWeight: 850,
              formatter: (value) => `${Math.round(value)}%`,
            },
            total: {
              show: true,
              label: t("charts.total"),
              formatter: () => formatNumber(forecastSummary.total, locale),
            },
          },
        },
      },
      legend: {
        show: true,
        position: "bottom",
        fontSize: "13px",
        itemMargin: { horizontal: 10, vertical: 6 },
      },
    };
  }, [forecastSummary.total, locale, t]);

  const campaignBubbleData = useMemo(() => {
    return campaigns
      .map((campaign) => {
        const budget = getCampaignBudget(campaign);
        const revenue = getCampaignRevenue(campaign);
        const roi = getCampaignRoi(campaign);

        return {
          name: getCampaignName(campaign, t("labels.untitledCampaign")),
          budget,
          revenue,
          roi,
          bubbleSize: Math.max(revenue || budget || 1, 1),
        };
      })
      .sort((a, b) => b.bubbleSize - a.bubbleSize)
      .slice(0, 10);
  }, [campaigns, t]);

  const campaignBubbleOptions = useMemo(() => {
    return {
      chart: {
        type: "bubble",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
      },
      colors: [CHART_COLORS.violet],
      fill: {
        opacity: 0.72,
      },
      stroke: {
        width: 2,
        colors: ["#ffffff"],
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      plotOptions: {
        bubble: {
          minBubbleRadius: 8,
          maxBubbleRadius: 32,
        },
      },
      xaxis: {
        title: { text: t("charts.axis.budget") },
        labels: {
          formatter: (value) => formatCurrency(value, locale),
        },
      },
      yaxis: {
        title: { text: t("charts.axis.roi") },
        labels: {
          formatter: (value) => formatPercent(value, locale),
        },
      },
      tooltip: {
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const point = w.config.series?.[seriesIndex]?.data?.[dataPointIndex];

          return `
            <div class="overview-chart-tooltip">
              <strong>${escapeHtml(point?.name || t("labels.untitledCampaign"))}</strong>
              <span>${escapeHtml(t("charts.tooltip.budget"))}: ${escapeHtml(
                formatCurrency(point?.x || 0, locale),
              )}</span>
              <span>${escapeHtml(t("charts.tooltip.roi"))}: ${escapeHtml(
                formatPercent(point?.y || 0, locale),
              )}</span>
              <span>${escapeHtml(t("charts.tooltip.revenue"))}: ${escapeHtml(
                formatCurrency(point?.revenue || 0, locale),
              )}</span>
            </div>
          `;
        },
      },
    };
  }, [locale, t]);

  const campaignStatusSeries = useMemo(() => {
    return CAMPAIGN_STATUS_ORDER.map((key) => campaignStats[key] || 0);
  }, [campaignStats]);

  const campaignStatusOptions = useMemo(() => {
    return {
      chart: {
        type: "donut",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: [
        CHART_COLORS.emerald,
        CHART_COLORS.blue,
        CHART_COLORS.slate,
        CHART_COLORS.amber,
        CHART_COLORS.indigo,
      ],
      labels: CAMPAIGN_STATUS_ORDER.map((key) =>
        t(CAMPAIGN_STATUS_LABEL_KEY[key]),
      ),
      dataLabels: { enabled: false },
      legend: {
        position: "bottom",
        fontSize: "13px",
        itemMargin: { horizontal: 10, vertical: 6 },
      },
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              total: {
                show: true,
                label: t("charts.total"),
                formatter: () => formatNumber(campaignStats.total, locale),
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatNumber(value, locale),
        },
      },
    };
  }, [campaignStats.total, locale, t]);

  const recentActivity = useMemo(() => {
    const items = [];

    (summary?.recentUploads || []).forEach((upload) => {
      const fileName =
        upload?.file_name ||
        upload?.filename ||
        upload?.name ||
        t("labels.uploadFile");

      const when = formatDateTime(
        upload?.uploaded_at || upload?.created_at || upload?.date,
        locale,
      );

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
      <PageHeader title={t(`roles.${dashboardKey}.title`)} />

      {error ? <div className="overview-error">{error}</div> : null}

      <BusinessProfileOverviewPanel />

      <div className="overview-top-grid">
        {topStats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              className={`overview-stat-card tone-${item.tone}`}
              key={item.key}
            >
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
                height={330}
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

        <Card title={t("charts.forecastStatus")}>
          <div className="chart-shell large">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : forecastSummary.total > 0 ? (
              <ReactApexChart
                type="radialBar"
                height={330}
                options={forecastRadialOptions}
                series={forecastRadialSeries}
              />
            ) : (
              <div className="chart-empty">{t("charts.noForecasts")}</div>
            )}
          </div>
        </Card>
      </div>

      <div className="overview-secondary-grid">
        <Card title={t("charts.productRevenueRank")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : productRevenueData.length ? (
              <ReactApexChart
                type="bar"
                height={315}
                options={productRevenueRankOptions}
                series={[
                  {
                    name: t("charts.revenueDatasetLabel"),
                    data: productRevenueData.map((item) => item.revenue),
                  },
                ]}
              />
            ) : (
              <div className="chart-empty">{t("charts.noProducts")}</div>
            )}
          </div>
        </Card>

        <Card title={t("charts.campaignPortfolio")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : campaignBubbleData.length ? (
              <ReactApexChart
                type="bubble"
                height={315}
                options={campaignBubbleOptions}
                series={[
                  {
                    name: t("charts.campaignsDatasetLabel"),
                    data: campaignBubbleData.map((item) => ({
                      x: item.budget,
                      y: item.roi,
                      z: item.bubbleSize,
                      name: item.name,
                      revenue: item.revenue,
                    })),
                  },
                ]}
              />
            ) : (
              <div className="chart-empty">{t("charts.noCampaigns")}</div>
            )}
          </div>
        </Card>
      </div>

      <div className="overview-secondary-grid">
        <Card title={t("charts.uploadsByStatus")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : uploads.length ? (
              <ReactApexChart
                type="donut"
                height={315}
                options={uploadsByStatusOptions}
                series={uploadsByStatusSeries}
              />
            ) : (
              <div className="chart-empty">{t("charts.noUploads")}</div>
            )}
          </div>
        </Card>

        <Card title={t("charts.campaignStatus")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : campaignStats.total > 0 ? (
              <ReactApexChart
                type="donut"
                height={315}
                options={campaignStatusOptions}
                series={campaignStatusSeries}
              />
            ) : (
              <div className="chart-empty">{t("charts.noCampaigns")}</div>
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
            <div className="chart-empty compact">
              {t("charts.noRecentUploads")}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}