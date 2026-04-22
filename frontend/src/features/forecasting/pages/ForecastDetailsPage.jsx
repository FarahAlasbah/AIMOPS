import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactApexChart from "react-apexcharts";

import {
  Button,
  Card,
  FormSelect,
  PageHeader,
} from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import {
  generateForecast,
  getForecastStatus,
  getProductForecast,
  getForecastExplanation,
  deleteForecastExplanation,
} from "../../../api/forecasts";

import "./ForecastDetailsPage.css";

const POLL_MS = 4000;
const MAX_FORECAST_DAYS = 90;
const DEFAULT_VISIBLE_DAYS = 14;
const WINDOW_PRESETS = [14, 21, 30, 60, 90];
const NO_DATA_HINTS = [
  "no data",
  "no usable",
  "not enough",
  "insufficient",
  "sales data",
  "history",
  "upload",
  "empty",
];

const EXPLANATION_CACHE_PREFIX = "aimops_forecast_explanation_v1";

const getExplanationCacheKey = (productId) =>
  `${EXPLANATION_CACHE_PREFIX}:${String(productId)}`;

const readExplanationCache = (productId) => {
  try {
    const raw = localStorage.getItem(getExplanationCacheKey(productId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeExplanationCache = (productId, value) => {
  try {
    localStorage.setItem(
      getExplanationCacheKey(productId),
      JSON.stringify(value ?? null),
    );
  } catch {
    // ignore storage errors
  }
};

const clearExplanationCache = (productId) => {
  try {
    localStorage.removeItem(getExplanationCacheKey(productId));
  } catch {
    // ignore storage errors
  }
};

const normalizeStatus = (value) => {
  const v = String(value || "").toLowerCase();

  if (["ready", "done", "success", "completed"].includes(v)) return "ready";
  if (["training", "queued", "pending", "running"].includes(v))
    return "training";
  if (["failed", "error"].includes(v)) return "failed";
  return "idle";
};

const isLikelyNoDataMessage = (value) => {
  const text = String(value || "").toLowerCase();
  return NO_DATA_HINTS.some((token) => text.includes(token));
};

const toLocalDateKey = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;

  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
};

const clampDateKey = (value, min, max) => {
  if (!value) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const addDaysToKey = (value, days) => {
  const d = parseDateKey(value);
  if (!d) return value;
  d.setDate(d.getDate() + Number(days || 0));
  return toLocalDateKey(d);
};

const getRangeLength = (start, end) => {
  const startDate = parseDateKey(start);
  const endDate = parseDateKey(end);
  if (!startDate || !endDate) return 0;

  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diff / 86400000) + 1);
};

const getWeekStartKey = (value) => {
  const d = parseDateKey(value);
  if (!d) return value;

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateKey(d);
};

const fmtNumber = (value, locale = "en") => {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtMoney = (value, locale = "en") => {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtDate = (value, locale = "en") => {
  if (!value) return "—";
  const d = parseDateKey(value) || new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const fmtDateTime = (value, locale = "en") => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale === "ar" ? "ar" : "en");
};

function ForecastDetailsSkeleton() {
  return (
    <>
      <div className="forecast-details-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="forecast-kpi">
            <div
              className="forecast-details-sk"
              style={{ width: "45%", marginBottom: 10 }}
            />
            <div className="forecast-details-sk" style={{ width: "70%" }} />
          </div>
        ))}
      </div>

      <Card className="forecast-details-card">
        <div className="forecast-meta-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="forecast-meta-item">
              <div
                className="forecast-details-sk"
                style={{ width: "42%", marginBottom: 8 }}
              />
              <div className="forecast-details-sk" style={{ width: "76%" }} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="forecast-details-card">
        <div className="forecast-chart-grid">
          <div className="forecast-chart-card">
            <div
              className="forecast-details-sk"
              style={{ width: "38%", marginBottom: 10 }}
            />
            <div
              className="forecast-details-sk"
              style={{ width: "55%", marginBottom: 14 }}
            />
            <div className="forecast-details-sk-box" />
          </div>

          <div className="forecast-chart-card">
            <div
              className="forecast-details-sk"
              style={{ width: "46%", marginBottom: 10 }}
            />
            <div
              className="forecast-details-sk"
              style={{ width: "52%", marginBottom: 14 }}
            />
            <div className="forecast-details-sk-box" style={{ height: 300 }} />
          </div>
        </div>
      </Card>
    </>
  );
}

export default function ForecastDetailsPage() {
  const { productId } = useParams();
  const { t, i18n } = useTranslation("forecasting");
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [windowPreset, setWindowPreset] = useState(
    String(DEFAULT_VISIBLE_DAYS),
  );
  const [selectedEndDate, setSelectedEndDate] = useState("");

  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState("");

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [detailsErr, setDetailsErr] = useState("");

  const [actionBusy, setActionBusy] = useState(false);
  const [info, setInfo] = useState(null);

  const [explanationData, setExplanationData] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationErr, setExplanationErr] = useState("");
  const [hasFetchedExplanation, setHasFetchedExplanation] = useState(false);

  const loadStatus = useCallback(async () => {
    setStatusErr("");

    try {
      const res = await getForecastStatus(productId);
      const nextStatus = {
        ...res,
        status: normalizeStatus(res?.status),
      };
      setStatus(nextStatus);
      return nextStatus;
    } catch (e) {
      setStatusErr(e?.message || t("messages.statusFailed"));
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, [productId, t]);

  const loadForecast = useCallback(async () => {
    setDetailsLoading(true);
    setDetailsErr("");

    try {
      const res = await getProductForecast(productId, {
        days: MAX_FORECAST_DAYS,
      });
      setForecast(res);
      return res;
    } catch (e) {
      setForecast(null);
      setDetailsErr(e?.message || t("messages.detailsFailed"));
      return null;
    } finally {
      setDetailsLoading(false);
    }
  }, [productId, t]);

  const loadExplanation = useCallback(async () => {
    setExplanationLoading(true);
    setExplanationErr("");

    try {
      const res = await getForecastExplanation(productId);
      setExplanationData(res);
      writeExplanationCache(productId, res);
      return res;
    } catch (e) {
      setExplanationData(null);

      const message =
        e?.response?.data?.detail ||
        e?.message ||
        t("messages.explanationFailed");

      setExplanationErr(String(message));
      return null;
    } finally {
      setExplanationLoading(false);
    }
  }, [productId, t]);

  const handleExplainWithAi = async () => {
    setHasFetchedExplanation(true);
    await loadExplanation();
  };

  const handleReExplainWithAi = async () => {
    setHasFetchedExplanation(true);
    setExplanationLoading(true);
    setExplanationErr("");

    try {
      await deleteForecastExplanation(productId);
      clearExplanationCache(productId);

      const res = await getForecastExplanation(productId);
      setExplanationData(res);
      writeExplanationCache(productId, res);
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.message ||
        t("messages.explanationFailed");

      setExplanationErr(String(message));
      setExplanationData(null);
    } finally {
      setExplanationLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const cached = readExplanationCache(productId);

    if (cached?.explanation) {
      setExplanationData(cached);
      setExplanationErr("");
      setExplanationLoading(false);
      setHasFetchedExplanation(true);
    } else {
      setExplanationData(null);
      setExplanationErr("");
      setExplanationLoading(false);
      setHasFetchedExplanation(false);
    }
  }, [productId]);

  useEffect(() => {
    if (status?.status === "ready") {
      loadForecast();
    } else {
      setForecast(null);
      setExplanationData(null);
      setExplanationErr("");
      setExplanationLoading(false);
      setHasFetchedExplanation(false);
    }
  }, [status?.status, loadForecast]);

  useEffect(() => {
    if (status?.status !== "training") return;

    const id = window.setInterval(loadStatus, POLL_MS);
    return () => window.clearInterval(id);
  }, [status?.status, loadStatus]);

  useEffect(() => {
    if (!forecast) return;

    const start = forecast?.forecast_period?.start || toLocalDateKey();
    const end =
      forecast?.forecast_period?.end ||
      forecast?.daily?.[forecast?.daily?.length - 1]?.date ||
      start;

    const defaultEnd = clampDateKey(
      addDaysToKey(start, DEFAULT_VISIBLE_DAYS - 1),
      start,
      end,
    );

    const visibleLength = getRangeLength(start, defaultEnd);
    setWindowPreset(
      String(
        WINDOW_PRESETS.includes(visibleLength)
          ? visibleLength
          : DEFAULT_VISIBLE_DAYS,
      ),
    );
    setSelectedEndDate(defaultEnd);
  }, [
    forecast?.product_id,
    forecast?.forecast_period?.start,
    forecast?.forecast_period?.end,
  ]);

  const handleGenerate = async (retrain = false) => {
    setActionBusy(true);
    setInfo(null);
    setStatusErr("");
    setDetailsErr("");

    try {
      const res = await generateForecast({
        productId: Number(productId),
        retrain,
      });

      setInfo({
        type: "success",
        text:
          res?.message ||
          t("messages.generateAccepted", {
            name: status?.product_name || `#${productId}`,
          }),
      });

      setExplanationData(null);
      setExplanationErr("");
      setExplanationLoading(false);
      setHasFetchedExplanation(false);
      clearExplanationCache(productId);

      await loadStatus();
    } catch (e) {
      setStatusErr(
        e?.message ||
          t("messages.generateFailed", {
            name: status?.product_name || `#${productId}`,
          }),
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleRefresh = async () => {
    setInfo(null);
    const nextStatus = await loadStatus();

    if (normalizeStatus(nextStatus?.status) === "ready") {
      await loadForecast();
    }
  };

  const daily = Array.isArray(forecast?.daily) ? forecast.daily : [];
  const forecastStart = forecast?.forecast_period?.start || toLocalDateKey();
  const forecastEnd =
    forecast?.forecast_period?.end ||
    daily?.[daily.length - 1]?.date ||
    forecastStart;

  const safeEndDate = clampDateKey(
    selectedEndDate || forecastEnd,
    forecastStart,
    forecastEnd,
  );

  const visibleDaily = useMemo(() => {
    return daily.filter((item) => {
      const date = String(item?.date || "");
      return date >= forecastStart && date <= safeEndDate;
    });
  }, [daily, forecastStart, safeEndDate]);

  const hasBounds = useMemo(() => {
    return visibleDaily.some(
      (item) => item?.quantity_lower != null || item?.quantity_upper != null,
    );
  }, [visibleDaily]);

  const selectedSummary = useMemo(() => {
    if (!visibleDaily.length) {
      return {
        totalQuantity: 0,
        avgDailyQuantity: 0,
        totalRevenue: 0,
        peakDate: null,
        peakQuantity: 0,
        confidence: forecast?.summary?.confidence || "—",
        hasEventBoosts: false,
      };
    }

    let totalQuantity = 0;
    let totalRevenue = 0;
    let peakDate = null;
    let peakQuantity = -Infinity;
    const confidenceCounts = {};

    for (const item of visibleDaily) {
      const qty = Number(item?.predicted_quantity || 0);
      const revenue = Number(item?.predicted_revenue || 0);
      const confidence = String(
        item?.confidence || forecast?.summary?.confidence || "medium",
      );

      totalQuantity += qty;
      totalRevenue += revenue;
      confidenceCounts[confidence] = (confidenceCounts[confidence] || 0) + 1;

      if (qty > peakQuantity) {
        peakQuantity = qty;
        peakDate = item?.date || null;
      }
    }

    const confidence =
      Object.entries(confidenceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      forecast?.summary?.confidence ||
      "—";

    return {
      totalQuantity,
      avgDailyQuantity: totalQuantity / visibleDaily.length,
      totalRevenue,
      peakDate,
      peakQuantity: Number.isFinite(peakQuantity) ? peakQuantity : 0,
      confidence,
      hasEventBoosts: visibleDaily.some((item) => !!item?.has_event_boost),
    };
  }, [visibleDaily, forecast?.summary?.confidence]);

  const weeklyBuckets = useMemo(() => {
    const map = new Map();

    for (const item of visibleDaily) {
      const weekStart = getWeekStartKey(item?.date);
      if (!weekStart) continue;

      const current = map.get(weekStart) || {
        weekStart,
        quantity: 0,
        revenue: 0,
        days: 0,
      };

      current.quantity += Number(item?.predicted_quantity || 0);
      current.revenue += Number(item?.predicted_revenue || 0);
      current.days += 1;
      map.set(weekStart, current);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart),
    );
  }, [visibleDaily]);

  const dailySeries = useMemo(() => {
    const series = [];

    if (hasBounds) {
      series.push({
        name: t("details.datasets.confidenceBand"),
        type: "rangeArea",
        data: visibleDaily.map((item) => {
          const predicted = Number(item?.predicted_quantity || 0);
          const lower =
            item?.quantity_lower == null
              ? predicted
              : Number(item.quantity_lower);
          const upper =
            item?.quantity_upper == null
              ? predicted
              : Number(item.quantity_upper);

          return {
            x: new Date(`${item?.date}T00:00:00`).getTime(),
            y: [lower, upper],
          };
        }),
      });
    }

    series.push({
      name: t("details.datasets.quantity"),
      type: "line",
      data: visibleDaily.map((item) => ({
        x: new Date(`${item?.date}T00:00:00`).getTime(),
        y: Number(item?.predicted_quantity || 0),
      })),
    });

    return series;
  }, [hasBounds, visibleDaily, t]);

  const dailyChartOptions = useMemo(() => {
    return {
      chart: {
        type: "line",
        height: 360,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        zoom: { enabled: true },
        foreColor: "#475569",
        fontFamily: "inherit",
      },
      colors: hasBounds ? ["#93c5fd", "#2563eb"] : ["#2563eb"],
      stroke: {
        curve: "smooth",
        width: hasBounds ? [0, 3] : [3],
      },
      fill: {
        opacity: hasBounds ? [0.22, 1] : [0.14],
      },
      dataLabels: { enabled: false },
      markers: {
        size: 0,
        hover: { sizeOffset: 4 },
      },
      legend: {
        position: "top",
        horizontalAlign: "left",
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
      },
      xaxis: {
        type: "datetime",
        labels: { datetimeUTC: false },
      },
      yaxis: {
        forceNiceScale: true,
        labels: {
          formatter: (value) => fmtNumber(value, locale),
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: { format: "dd MMM yyyy" },
        y: {
          formatter: (value, ctx) => {
            const point = visibleDaily?.[ctx?.dataPointIndex];
            const seriesName =
              ctx?.w?.globals?.seriesNames?.[ctx?.seriesIndex] || "";

            if (seriesName === t("details.datasets.confidenceBand")) {
              return `${fmtNumber(point?.quantity_lower, locale)} → ${fmtNumber(point?.quantity_upper, locale)}`;
            }

            return fmtNumber(value, locale);
          },
        },
      },
      annotations: {
        xaxis: selectedSummary?.peakDate
          ? [
              {
                x: new Date(`${selectedSummary.peakDate}T00:00:00`).getTime(),
                borderColor: "#f59e0b",
                strokeDashArray: 4,
                label: {
                  text: t("details.annotations.peakDay"),
                  style: {
                    background: "#f59e0b",
                    color: "#fff",
                    fontSize: "11px",
                  },
                },
              },
            ]
          : [],
      },
    };
  }, [hasBounds, locale, selectedSummary?.peakDate, t, visibleDaily]);

  const weeklyChartSeries = useMemo(() => {
    return [
      {
        name: t("details.datasets.weeklyQuantity"),
        type: "column",
        data: weeklyBuckets.map((item) => ({
          x: new Date(`${item.weekStart}T00:00:00`).getTime(),
          y: Number(item.quantity.toFixed(2)),
        })),
      },
      {
        name: t("details.datasets.weeklyRevenue"),
        type: "line",
        data: weeklyBuckets.map((item) => ({
          x: new Date(`${item.weekStart}T00:00:00`).getTime(),
          y: Number(item.revenue.toFixed(2)),
        })),
      },
    ];
  }, [weeklyBuckets, t]);

  const weeklyChartOptions = useMemo(() => {
    return {
      chart: {
        type: "line",
        height: 300,
        toolbar: { show: false },
        foreColor: "#475569",
        fontFamily: "inherit",
      },
      colors: ["#1d4ed8", "#0f766e"],
      stroke: {
        width: [0, 3],
        curve: "smooth",
      },
      fill: {
        opacity: [0.9, 1],
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "48%",
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: [0, 4],
        hover: { sizeOffset: 3 },
      },
      legend: {
        position: "top",
        horizontalAlign: "left",
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
      },
      xaxis: {
        type: "datetime",
        labels: { datetimeUTC: false },
      },
      yaxis: [
        {
          title: { text: t("details.yAxes.quantity") },
          labels: {
            formatter: (value) => fmtNumber(value, locale),
          },
        },
        {
          opposite: true,
          title: { text: t("details.yAxes.revenue") },
          labels: {
            formatter: (value) => fmtMoney(value, locale),
          },
        },
      ],
      tooltip: {
        shared: true,
        intersect: false,
        x: { format: "dd MMM yyyy" },
      },
    };
  }, [locale, t]);

  const explanationText = useMemo(() => {
    if (!explanationData) return "";
    return String(explanationData?.explanation || "").trim();
  }, [explanationData]);

  const hasExplanation = Boolean(explanationText);

  const isExplanationStale = useMemo(() => {
    if (!hasExplanation) return false;

    const explanationTime = new Date(explanationData?.generated_at).getTime();
    const forecastTime = new Date(
      forecast?.model?.trained_at || status?.trained_at || "",
    ).getTime();

    if (Number.isNaN(explanationTime) || Number.isNaN(forecastTime)) {
      return false;
    }

    return forecastTime > explanationTime;
  }, [explanationData, forecast, status, hasExplanation]);

  const handlePresetChange = (e) => {
    const nextValue = String(e.target.value || DEFAULT_VISIBLE_DAYS);
    setWindowPreset(nextValue);

    const days = Number(nextValue) || DEFAULT_VISIBLE_DAYS;
    const nextEnd = clampDateKey(
      addDaysToKey(forecastStart, days - 1),
      forecastStart,
      forecastEnd,
    );

    setSelectedEndDate(nextEnd);
  };

  const statusLikelyNoData = isLikelyNoDataMessage(status?.error);
  const detailsLikelyNoData = isLikelyNoDataMessage(detailsErr);
  const likelyNoData = statusLikelyNoData || detailsLikelyNoData;
  const noForecastInRange = visibleDaily.length === 0;

  const productDisplayName =
    status?.product_name || forecast?.product_name || `Product #${productId}`;

  const productCategory = forecast?.category || status?.category || "—";

  return (
    <div className="forecast-details-page">
      <PageHeader
        title={productDisplayName}
        subtitle={t("details.pageSubtitle")}
        actions={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/app/forecasting")}
            >
              {t("details.back")}
            </Button>

            <Button type="button" variant="secondary" onClick={handleRefresh}>
              {t("details.refresh")}
            </Button>
          </div>
        }
      />

      <Card className="forecast-details-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#6b7280",
                marginBottom: 6,
              }}
            >
              Product
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1.2,
              }}
            >
              {productDisplayName}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: "#6b7280" }}>
              Category: {productCategory}
            </div>
          </div>
        </div>
      </Card>

      {statusErr ? <InfoMessage type="error">{statusErr}</InfoMessage> : null}
      {detailsErr ? <InfoMessage type="error">{detailsErr}</InfoMessage> : null}
      {info ? <InfoMessage type={info.type}>{info.text}</InfoMessage> : null}

      {statusLoading ? (
        <ForecastDetailsSkeleton />
      ) : status?.status !== "ready" ? (
        <Card>
          <InfoMessage
            type={
              likelyNoData
                ? "warning"
                : status?.status === "failed"
                  ? "error"
                  : "info"
            }
          >
            {likelyNoData
              ? t("messages.noDataDetected")
              : status?.status === "training"
                ? t("details.trainingMessage")
                : status?.status === "failed"
                  ? t("details.failedMessage")
                  : t("details.notReadyMessage")}
          </InfoMessage>

          <div className="forecast-state-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/app/data-upload")}
            >
              {t("actions.uploadData")}
            </Button>

            {status?.status === "failed" ? (
              <Button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={actionBusy}
              >
                {actionBusy ? t("actions.generating") : t("actions.retry")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={actionBusy}
              >
                {actionBusy ? t("actions.generating") : t("actions.generate")}
              </Button>
            )}
          </div>

          {status?.error ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#991b1b",
                lineHeight: 1.5,
              }}
            >
              {status.error}
            </div>
          ) : null}
        </Card>
      ) : detailsLoading && !forecast ? (
        <ForecastDetailsSkeleton />
      ) : !forecast ? (
        <Card>
          <InfoMessage type={likelyNoData ? "warning" : "error"}>
            {likelyNoData
              ? t("messages.noDataDetected")
              : t("messages.detailsFailed")}
          </InfoMessage>

          <div className="forecast-state-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/app/data-upload")}
            >
              {t("actions.uploadData")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleRefresh}>
              {t("details.refresh")}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="forecast-details-grid">
            <div className="forecast-kpi">
              <div className="forecast-kpi-label">
                {t("details.summaryQuantity")}
              </div>
              <div className="forecast-kpi-value">
                {fmtNumber(selectedSummary.totalQuantity, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">
                {t("details.summaryAvg")}
              </div>
              <div className="forecast-kpi-value">
                {fmtNumber(selectedSummary.avgDailyQuantity, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">
                {t("details.summaryRevenue")}
              </div>
              <div className="forecast-kpi-value">
                {fmtMoney(selectedSummary.totalRevenue, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">
                {t("details.summaryPeak")}
              </div>
              <div className="forecast-kpi-value">
                {fmtDate(selectedSummary.peakDate, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">
                {t("details.summaryPeakQty")}
              </div>
              <div className="forecast-kpi-value">
                {fmtNumber(selectedSummary.peakQuantity, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">
                {t("details.summaryConfidence")}
              </div>
              <div className="forecast-kpi-value">
                {selectedSummary.confidence || "—"}
              </div>
            </div>
          </div>

          <Card className="forecast-details-card">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  padding: "4px 0",
                  background: "transparent",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#9ca3af",
                    marginBottom: 8,
                  }}
                >
                  {t("details.metaPeriod")}
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#111827",
                    lineHeight: 1.35,
                  }}
                >
                  {fmtDate(forecastStart, locale)}
                  <span style={{ margin: "0 10px", color: "#d1d5db" }}>→</span>
                  {fmtDate(forecastEnd, locale)}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid #e5e7eb",
                display: "grid",
                gridTemplateColumns: selectedSummary.hasEventBoosts
                  ? "220px minmax(280px, 1fr) auto"
                  : "220px minmax(280px, 1fr)",
                gap: 20,
                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <FormSelect
                  label={t("details.visibleWindowLabel")}
                  options={[
                    { value: "14", label: t("details.days14") },
                    { value: "21", label: t("details.days21") },
                    { value: "30", label: t("details.days30") },
                    { value: "60", label: t("details.days60") },
                    { value: "90", label: t("details.days90") },
                  ]}
                  value={windowPreset}
                  onChange={handlePresetChange}
                />
              </div>

              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#9ca3af",
                    marginBottom: 10,
                  }}
                >
                  Selected Range
                </div>

                <div
                  style={{
                    height: 42,
                    display: "flex",
                    alignItems: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#111827",
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span>{fmtDate(forecastStart, locale)}</span>
                  <span
                    style={{
                      margin: "0 8px",
                      color: "#d1d5db",
                      flex: "0 0 auto",
                    }}
                  >
                    →
                  </span>
                  <span>{fmtDate(safeEndDate, locale)}</span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      flex: "0 0 auto",
                    }}
                  >
                    ({visibleDaily.length}{" "}
                    {t("details.days14").replace("14 ", "").toLowerCase()})
                  </span>
                </div>
              </div>

              {selectedSummary.hasEventBoosts ? (
                <div
                  style={{
                    minHeight: 42,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span className="forecast-badge accent">
                    {t("details.eventBoostsActive")}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="forecast-chart-grid">
              <div className="forecast-chart-card">
                <div className="forecast-chart-title">
                  {t("details.dailyTitle")}
                </div>
                <div className="forecast-chart-subtitle">
                  {t("details.dailySubtitle")}
                </div>

                <div className="forecast-chart-box">
                  {noForecastInRange ? (
                    <InfoMessage type="warning">
                      {t("details.selectionEmpty")}
                    </InfoMessage>
                  ) : (
                    <ReactApexChart
                      type="line"
                      height={360}
                      series={dailySeries}
                      options={dailyChartOptions}
                    />
                  )}
                </div>
              </div>

              <div className="forecast-chart-card">
                <div className="forecast-chart-title">
                  {t("details.weeklyTitle")}
                </div>
                <div className="forecast-chart-subtitle">
                  {t("details.weeklySubtitle")}
                </div>

                <div className="forecast-chart-box small">
                  {weeklyBuckets.length === 0 ? (
                    <InfoMessage type="info">
                      {t("details.selectionEmpty")}
                    </InfoMessage>
                  ) : (
                    <ReactApexChart
                      type="line"
                      height={300}
                      series={weeklyChartSeries}
                      options={weeklyChartOptions}
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="forecast-explanation">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div className="forecast-explanation-title">AI Explanation</div>

              {!hasFetchedExplanation ? (
                <Button
                  type="button"
                  onClick={handleExplainWithAi}
                  disabled={explanationLoading}
                >
                  {explanationLoading ? "Generating..." : "Explain with AI"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReExplainWithAi}
                  disabled={explanationLoading}
                >
                  {explanationLoading
                    ? "Regenerating..."
                    : "Re-explain with AI"}
                </Button>
              )}
            </div>

            {!hasFetchedExplanation && !explanationLoading ? (
              <div className="forecast-explanation-text">
                AI explanation is generated only when requested.
              </div>
            ) : null}

            {explanationLoading ? (
              <div className="forecast-explanation-text">
                Generating explanation...
              </div>
            ) : null}

            {hasFetchedExplanation && hasExplanation ? (
              <>
                {isExplanationStale ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #fed7aa",
                      background: "#fff7ed",
                      color: "#9a3412",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    This explanation is older than the current forecast.
                    Re-explain to refresh it.
                  </div>
                ) : null}

                <div className="forecast-explanation-text">
                  {explanationText}
                </div>
              </>
            ) : null}

            {hasFetchedExplanation &&
            Array.isArray(explanationData?.key_drivers) &&
            explanationData.key_drivers.length > 0 ? (
              <>
                <div className="forecast-drivers-title">Key Drivers</div>
                <ul className="forecast-explanation-list">
                  {explanationData.key_drivers.map((driver, index) => (
                    <li key={`${driver}-${index}`}>{driver}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {hasFetchedExplanation && explanationData?.generated_at ? (
              <div className="forecast-note" style={{ marginTop: 10 }}>
                Generated at:{" "}
                {fmtDateTime(explanationData.generated_at, locale)}
                {explanationData?.cached ? " • Cached" : ""}
              </div>
            ) : null}

            {hasFetchedExplanation && explanationErr ? (
              <div className="forecast-note" style={{ marginTop: 10 }}>
                {explanationErr}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
