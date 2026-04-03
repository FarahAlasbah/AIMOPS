// frontend/src/features/forecasting/pages/ForecastDetailsPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

import { Button, Card, FormSelect, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import {
  generateForecast,
  getForecastStatus,
  getProductForecast,
} from "../../../api/forecasts";

import "./ForecastDetailsPage.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

const POLL_MS = 4000;

const normalizeStatus = (value) => {
  const v = String(value || "").toLowerCase();

  if (["ready", "done", "success", "completed"].includes(v)) return "ready";
  if (["training", "queued", "pending", "running"].includes(v)) return "training";
  if (["failed", "error"].includes(v)) return "failed";
  return "idle";
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtDate = (value, locale = "en") => {
  if (!value) return "—";
  const d = new Date(value);
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
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="forecast-kpi">
            <div className="forecast-details-sk" style={{ width: "45%", marginBottom: 10 }} />
            <div className="forecast-details-sk" style={{ width: "70%" }} />
          </div>
        ))}
      </div>

      <Card className="forecast-details-card">
        <div className="forecast-meta-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="forecast-meta-item">
              <div className="forecast-details-sk" style={{ width: "42%", marginBottom: 8 }} />
              <div className="forecast-details-sk" style={{ width: "76%" }} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="forecast-details-card">
        <div className="forecast-chart-grid">
          <div className="forecast-chart-card">
            <div className="forecast-details-sk" style={{ width: "38%", marginBottom: 10 }} />
            <div className="forecast-details-sk" style={{ width: "55%", marginBottom: 14 }} />
            <div className="forecast-details-sk-box" />
          </div>

          <div className="forecast-chart-card">
            <div className="forecast-details-sk" style={{ width: "46%", marginBottom: 10 }} />
            <div className="forecast-details-sk" style={{ width: "52%", marginBottom: 14 }} />
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

  const [days, setDays] = useState("30");

  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState("");

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [detailsErr, setDetailsErr] = useState("");

  const [actionBusy, setActionBusy] = useState(false);
  const [info, setInfo] = useState(null);

  const loadStatus = useCallback(async () => {
    setStatusErr("");
    try {
      const res = await getForecastStatus(productId);
      setStatus({
        ...res,
        status: normalizeStatus(res?.status),
      });
    } catch (e) {
      setStatusErr(e?.message || t("messages.statusFailed"));
    } finally {
      setStatusLoading(false);
    }
  }, [productId, t]);

  const loadForecast = useCallback(async () => {
    setDetailsLoading(true);
    setDetailsErr("");

    try {
      const res = await getProductForecast(productId, { days: Number(days) || 30 });
      setForecast(res);
    } catch (e) {
      setDetailsErr(e?.message || t("messages.detailsFailed"));
    } finally {
      setDetailsLoading(false);
    }
  }, [productId, days, t]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (status?.status === "ready") {
      loadForecast();
    } else {
      setForecast(null);
    }
  }, [status?.status, loadForecast]);

  useEffect(() => {
    if (status?.status !== "training") return;

    const id = window.setInterval(loadStatus, POLL_MS);
    return () => window.clearInterval(id);
  }, [status?.status, loadStatus]);

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

      await loadStatus();
    } catch (e) {
      setStatusErr(
        e?.message ||
          t("messages.generateFailed", {
            name: status?.product_name || `#${productId}`,
          })
      );
    } finally {
      setActionBusy(false);
    }
  };

  const daily = Array.isArray(forecast?.daily) ? forecast.daily : [];
  const weekly = Array.isArray(forecast?.weekly_summary) ? forecast.weekly_summary : [];

  const hasBounds = useMemo(() => {
    return daily.some(
      (item) => item?.quantity_lower != null || item?.quantity_upper != null
    );
  }, [daily]);

  const dailyChartData = useMemo(() => {
    return {
      labels: daily.map((item) => fmtDate(item?.date, locale)),
      datasets: [
        {
          label: t("details.datasets.quantity"),
          data: daily.map((item) => Number(item?.predicted_quantity || 0)),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: "#2563eb",
        },
        ...(hasBounds
          ? [
              {
                label: t("details.datasets.upper"),
                data: daily.map((item) =>
                  item?.quantity_upper == null ? null : Number(item.quantity_upper)
                ),
                borderColor: "rgba(59, 130, 246, 0.45)",
                backgroundColor: "transparent",
                borderDash: [6, 6],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
              },
              {
                label: t("details.datasets.lower"),
                data: daily.map((item) =>
                  item?.quantity_lower == null ? null : Number(item.quantity_lower)
                ),
                borderColor: "rgba(147, 197, 253, 0.95)",
                backgroundColor: "transparent",
                borderDash: [6, 6],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
              },
            ]
          : []),
      ],
    };
  }, [daily, hasBounds, locale, t]);

  const dailyChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          backgroundColor: "#0f172a",
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtNumber(ctx.parsed.y, locale)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, minRotation: 0 },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => fmtNumber(value, locale),
          },
        },
      },
    };
  }, [locale]);

  const hasWeeklyRevenue = useMemo(() => {
    return weekly.some((item) => Number(item?.revenue || 0) > 0);
  }, [weekly]);

  const weeklyChartData = useMemo(() => {
    return {
      labels: weekly.map((item) => fmtDate(item?.week_start, locale)),
      datasets: [
        {
          label: hasWeeklyRevenue
            ? t("details.datasets.weeklyRevenue")
            : t("details.datasets.weeklyQuantity"),
          data: weekly.map((item) =>
            Number(hasWeeklyRevenue ? item?.revenue || 0 : item?.quantity || 0)
          ),
          backgroundColor: hasWeeklyRevenue
            ? "rgba(13, 148, 136, 0.78)"
            : "rgba(245, 158, 11, 0.78)",
          borderColor: hasWeeklyRevenue ? "#0f766e" : "#d97706",
          borderWidth: 1.5,
          borderRadius: 8,
        },
      ],
    };
  }, [weekly, hasWeeklyRevenue, locale, t]);

  const weeklyChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0f172a",
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtNumber(ctx.parsed.y, locale)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => fmtNumber(value, locale),
          },
        },
      },
    };
  }, [locale]);

  return (
    <div className="forecast-details-page">
      <PageHeader
        title={status?.product_name || t("details.pageTitle")}
        subtitle={t("details.pageSubtitle")}
        actions={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="button" variant="secondary" onClick={() => navigate("/app/forecasting")}>
              {t("details.back")}
            </Button>

            <Button type="button" variant="secondary" onClick={loadStatus}>
              {t("details.refresh")}
            </Button>
          </div>
        }
      />

      {statusErr ? <InfoMessage type="error">{statusErr}</InfoMessage> : null}
      {detailsErr ? <InfoMessage type="error">{detailsErr}</InfoMessage> : null}
      {info ? <InfoMessage type={info.type}>{info.text}</InfoMessage> : null}

      {statusLoading ? (
        <ForecastDetailsSkeleton />
      ) : status?.status !== "ready" ? (
        <Card>
          <InfoMessage type={status?.status === "failed" ? "error" : "info"}>
            {status?.status === "training"
              ? t("details.trainingMessage")
              : status?.status === "failed"
              ? t("details.failedMessage")
              : t("details.notReadyMessage")}
          </InfoMessage>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            {status?.status === "failed" ? (
              <Button type="button" onClick={() => handleGenerate(true)} disabled={actionBusy}>
                {actionBusy ? t("actions.generating") : t("actions.retry")}
              </Button>
            ) : (
              <Button type="button" onClick={() => handleGenerate(false)} disabled={actionBusy}>
                {actionBusy ? t("actions.generating") : t("actions.generate")}
              </Button>
            )}
          </div>

          {status?.error ? (
            <div style={{ marginTop: 12, fontSize: 13, color: "#991b1b", lineHeight: 1.5 }}>
              {status.error}
            </div>
          ) : null}
        </Card>
      ) : detailsLoading || !forecast ? (
        <ForecastDetailsSkeleton />
      ) : (
        <>
          <div className="forecast-details-grid">
            <div className="forecast-kpi">
              <div className="forecast-kpi-label">{t("details.summaryQuantity")}</div>
              <div className="forecast-kpi-value">
                {fmtNumber(forecast?.summary?.total_quantity, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">{t("details.summaryAvg")}</div>
              <div className="forecast-kpi-value">
                {fmtNumber(forecast?.summary?.avg_daily_quantity, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">{t("details.summaryPeak")}</div>
              <div className="forecast-kpi-value">
                {fmtDate(forecast?.summary?.peak_date, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">{t("details.summaryRevenue")}</div>
              <div className="forecast-kpi-value">
                {fmtMoney(forecast?.summary?.total_revenue, locale)}
              </div>
            </div>

            <div className="forecast-kpi">
              <div className="forecast-kpi-label">{t("details.summaryConfidence")}</div>
              <div className="forecast-kpi-value">
                {forecast?.summary?.confidence || "—"}
              </div>
            </div>
          </div>

          <Card className="forecast-details-card">
            <div style={{ maxWidth: 220, marginBottom: 14 }}>
              <FormSelect
                label={t("details.daysLabel")}
                options={[
                  { value: "30", label: t("details.days30") },
                  { value: "60", label: t("details.days60") },
                  { value: "90", label: t("details.days90") },
                ]}
                value={String(days)}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>

            <div className="forecast-meta-grid">
              <div className="forecast-meta-item">
                <div className="forecast-meta-label">{t("details.metaProduct")}</div>
                <div className="forecast-meta-value">{forecast?.product_name || "—"}</div>
              </div>

              <div className="forecast-meta-item">
                <div className="forecast-meta-label">{t("details.metaCategory")}</div>
                <div className="forecast-meta-value">{forecast?.category || "—"}</div>
              </div>

              <div className="forecast-meta-item">
                <div className="forecast-meta-label">{t("details.metaModel")}</div>
                <div className="forecast-meta-value">{forecast?.model?.tier || "—"}</div>
              </div>

              <div className="forecast-meta-item">
                <div className="forecast-meta-label">{t("details.metaTrained")}</div>
                <div className="forecast-meta-value">
                  {fmtDateTime(forecast?.model?.trained_at, locale)}
                </div>
              </div>

              <div className="forecast-meta-item">
                <div className="forecast-meta-label">{t("details.metaPeriod")}</div>
                <div className="forecast-meta-value">
                  {forecast?.forecast_period?.start || "—"} → {forecast?.forecast_period?.end || "—"}
                </div>
              </div>
            </div>
          </Card>

          <Card className="forecast-details-card">
            <div className="forecast-chart-grid">
              <div className="forecast-chart-card">
                <div className="forecast-chart-title">{t("details.dailyTitle")}</div>
                <div className="forecast-chart-subtitle">{t("details.dailySubtitle")}</div>

                <div className="forecast-chart-box">
                  <Line data={dailyChartData} options={dailyChartOptions} />
                </div>
              </div>

              <div className="forecast-chart-card">
                <div className="forecast-chart-title">{t("details.weeklyTitle")}</div>
                <div className="forecast-chart-subtitle">
                  {hasWeeklyRevenue
                    ? t("details.weeklySubtitleRevenue")
                    : t("details.weeklySubtitleQuantity")}
                </div>

                <div className="forecast-chart-box small">
                  <Bar data={weeklyChartData} options={weeklyChartOptions} />
                </div>
              </div>
            </div>
          </Card>

          <div className="forecast-explanation">
            <div className="forecast-explanation-title">{t("details.explanationTitle")}</div>
            <div className="forecast-explanation-text">
              {t("details.explanationBody", {
                quantity: fmtNumber(forecast?.summary?.total_quantity, locale),
                days: forecast?.forecast_period?.days || Number(days),
                avg: fmtNumber(forecast?.summary?.avg_daily_quantity, locale),
                peakDate: fmtDate(forecast?.summary?.peak_date, locale),
                revenue: fmtMoney(forecast?.summary?.total_revenue, locale),
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}