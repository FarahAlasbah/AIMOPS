// frontend/src/features/dashboard/pages/useOverviewCharts.js
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  CHART_COLORS,
  STATUS_ORDER,
  STATUS_LABEL_KEY,
  FORECAST_STATUS_ORDER,
  FORECAST_STATUS_LABEL_KEY,
  CAMPAIGN_STATUS_ORDER,
  CAMPAIGN_STATUS_LABEL_KEY,
} from "./overviewConstants";
import {
  toNumber,
  dayKey,
  shortDayLabel,
  getProductName,
  getProductRevenue,
  getCampaignName,
  getCampaignBudget,
  getCampaignRevenue,
  getCampaignRoi,
  formatNumber,
  formatCompactNumber,
  formatCurrency,
  formatPercent,
  escapeHtml,
} from "./overviewUtils";

export function useOverviewCharts({
  locale,
  uploads,
  uploadStatusStats,
  products,
  campaigns,
  forecastSummary,
  campaignStats,
  reportData,
}) {
  const { t } = useTranslation("dashboard");

  // ── Uploads over time ────────────────────────────────────────────────────────
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

  const uploadsOverTimeOptions = useMemo(() => ({
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      animations: { enabled: true, speed: 650 },
    },
    colors: [CHART_COLORS.blue],
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    markers: { size: 4, strokeWidth: 2, hover: { size: 6 } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#eef2f7", strokeDashArray: 4 },
    xaxis: {
      categories: uploadsOverTime.categories,
      labels: { style: { fontSize: "12px" } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { formatter: (value) => formatNumber(value, locale) },
    },
    tooltip: { y: { formatter: (value) => formatNumber(value, locale) } },
  }), [uploadsOverTime.categories, locale]);

  // ── Uploads by status ────────────────────────────────────────────────────────
  const uploadsByStatusSeries = useMemo(
    () => STATUS_ORDER.map((key) => uploadStatusStats[key] || 0),
    [uploadStatusStats],
  );

  const uploadsByStatusOptions = useMemo(() => ({
    chart: { type: "donut", toolbar: { show: false }, fontFamily: "inherit" },
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
              formatter: () => formatNumber(uploads.length, locale),
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (value) => formatNumber(value, locale) } },
  }), [uploads.length, locale, t, uploadStatusStats]);

  // ── Product revenue ──────────────────────────────────────────────────────────
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

  const productRevenueRankOptions = useMemo(() => ({
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      animations: { enabled: true, speed: 650 },
    },
    colors: [CHART_COLORS.navy],
    plotOptions: {
      bar: { horizontal: true, borderRadius: 8, barHeight: "48%" },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#eef2f7",
      strokeDashArray: 4,
      padding: { right: 18, left: 8 },
    },
    xaxis: {
      categories: productRevenueData.map((item) => item.name),
      labels: {
        formatter: (value) => formatCompactNumber(value, locale),
        style: { colors: "#6b7280", fontSize: "12px" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        maxWidth: 180,
        style: { colors: "#111827", fontSize: "13px", fontWeight: 750 },
      },
    },
    tooltip: { y: { formatter: (value) => formatCurrency(value, locale) } },
  }), [productRevenueData, locale]);

  // ── Forecast radial ──────────────────────────────────────────────────────────
  const forecastRadialSeries = useMemo(() => {
    const total = Math.max(toNumber(forecastSummary.total, 0), 1);
    return FORECAST_STATUS_ORDER.map((key) =>
      Math.round((toNumber(forecastSummary?.[key], 0) / total) * 100),
    );
  }, [forecastSummary]);

  const forecastRadialOptions = useMemo(() => ({
    chart: { type: "radialBar", toolbar: { show: false }, fontFamily: "inherit" },
    colors: [
      CHART_COLORS.emerald,
      CHART_COLORS.blue,
      CHART_COLORS.red,
      CHART_COLORS.slate,
    ],
    labels: FORECAST_STATUS_ORDER.map((key) => t(FORECAST_STATUS_LABEL_KEY[key])),
    plotOptions: {
      radialBar: {
        hollow: { size: "34%" },
        track: { background: "#eef2f7", margin: 7 },
        dataLabels: {
          name: { fontSize: "13px", fontWeight: 800 },
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
  }), [forecastSummary.total, locale, t]);

  // ── Campaign bubble ──────────────────────────────────────────────────────────
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

  const campaignBubbleOptions = useMemo(() => ({
    chart: {
      type: "bubble",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
    },
    colors: [CHART_COLORS.violet],
    fill: { opacity: 0.72 },
    stroke: { width: 2, colors: ["#ffffff"] },
    dataLabels: { enabled: false },
    grid: { borderColor: "#eef2f7", strokeDashArray: 4 },
    plotOptions: { bubble: { minBubbleRadius: 8, maxBubbleRadius: 32 } },
    xaxis: {
      title: { text: t("charts.axis.budget") },
      labels: { formatter: (value) => formatCurrency(value, locale) },
    },
    yaxis: {
      title: { text: t("charts.axis.roi") },
      labels: { formatter: (value) => formatPercent(value, locale) },
    },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const point = w.config.series?.[seriesIndex]?.data?.[dataPointIndex];
        return `
          <div class="overview-chart-tooltip">
            <strong>${escapeHtml(point?.name || t("labels.untitledCampaign"))}</strong>
            <span>${escapeHtml(t("charts.tooltip.budget"))}: ${escapeHtml(formatCurrency(point?.x || 0, locale))}</span>
            <span>${escapeHtml(t("charts.tooltip.roi"))}: ${escapeHtml(formatPercent(point?.y || 0, locale))}</span>
            <span>${escapeHtml(t("charts.tooltip.revenue"))}: ${escapeHtml(formatCurrency(point?.revenue || 0, locale))}</span>
          </div>
        `;
      },
    },
  }), [locale, t]);

  // ── Campaign status donut ────────────────────────────────────────────────────
  const campaignStatusSeries = useMemo(
    () => CAMPAIGN_STATUS_ORDER.map((key) => campaignStats[key] || 0),
    [campaignStats],
  );

  const campaignStatusOptions = useMemo(() => ({
    chart: { type: "donut", toolbar: { show: false }, fontFamily: "inherit" },
    colors: [
      CHART_COLORS.emerald,
      CHART_COLORS.blue,
      CHART_COLORS.slate,
      CHART_COLORS.amber,
      CHART_COLORS.indigo,
    ],
    labels: CAMPAIGN_STATUS_ORDER.map((key) => t(CAMPAIGN_STATUS_LABEL_KEY[key])),
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
    tooltip: { y: { formatter: (value) => formatNumber(value, locale) } },
  }), [campaignStats.total, locale, t]);

  return {
    uploadsOverTime,
    uploadsOverTimeOptions,
    uploadsByStatusSeries,
    uploadsByStatusOptions,
    productRevenueData,
    productRevenueRankOptions,
    forecastRadialSeries,
    forecastRadialOptions,
    campaignBubbleData,
    campaignBubbleOptions,
    campaignStatusSeries,
    campaignStatusOptions,
  };
}