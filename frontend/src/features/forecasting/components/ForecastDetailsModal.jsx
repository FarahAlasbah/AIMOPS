import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import InfoMessage from "../../../shared/components/InfoMessage";
import { ForecastDetailsSkeleton } from "./ForecastingSkeletons";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const fmtNumber = (n, digits = 2) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, { maximumFractionDigits: digits });
};

const fmtCurrency = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
};

function buildDailyChart(detail, t) {
  const rows = Array.isArray(detail?.daily) ? detail.daily : [];
  const labels = rows.map((row) => row?.date || "");
  return {
    data: {
      labels,
      datasets: [
        {
          label: t("details.charts.dailyQty"),
          data: rows.map((row) => Number(row?.predicted_quantity || 0)),
          tension: 0.3,
          fill: false,
        },
        {
          label: t("details.charts.upperBand"),
          data: rows.map((row) => {
            const upper = Number(row?.quantity_upper);
            return Number.isFinite(upper) ? upper : null;
          }),
          tension: 0.25,
          fill: false,
        },
        {
          label: t("details.charts.lowerBand"),
          data: rows.map((row) => {
            const lower = Number(row?.quantity_lower);
            return Number.isFinite(lower) ? lower : null;
          }),
          tension: 0.25,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8 },
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  };
}

function buildWeeklyRevenueChart(detail, t) {
  const rows = Array.isArray(detail?.weekly_summary) ? detail.weekly_summary : [];
  return {
    data: {
      labels: rows.map((row) => row?.week_start || ""),
      datasets: [
        {
          label: t("details.charts.weeklyRevenue"),
          data: rows.map((row) => Number(row?.revenue || 0)),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } },
    },
  };
}

export default function ForecastDetailsModal({
  open,
  detail,
  loading,
  error,
  onClose,
}) {
  const { t } = useTranslation("forecasting");

  const dailyChart = useMemo(() => buildDailyChart(detail, t), [detail, t]);
  const weeklyRevenueChart = useMemo(() => buildWeeklyRevenueChart(detail, t), [detail, t]);

  if (!open) return null;

  return (
    <div className="forecast-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="forecast-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="forecast-modal-head">
          <div>
            <div className="forecast-modal-title">
              {detail?.product_name || t("details.title")}
            </div>
            <div className="forecast-modal-sub">
              {detail?.category || "—"} · {t("details.period", { start: detail?.forecast_period?.start || "—", end: detail?.forecast_period?.end || "—" })}
            </div>
          </div>

          <button type="button" className="forecast-modal-close" onClick={onClose}>
            {t("details.close")}
          </button>
        </div>

        {loading ? (
          <ForecastDetailsSkeleton />
        ) : error ? (
          <div className="forecast-detail-body">
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        ) : !detail ? (
          <div className="forecast-detail-body">
            <InfoMessage type="info">{t("details.empty")}</InfoMessage>
          </div>
        ) : (
          <div className="forecast-detail-body">
            <div className="forecast-detail-kpis">
              <div className="forecast-mini-card">
                <div className="forecast-mini-label">{t("details.kpis.totalQuantity")}</div>
                <div className="forecast-mini-value">{fmtNumber(detail?.summary?.total_quantity)}</div>
              </div>

              <div className="forecast-mini-card">
                <div className="forecast-mini-label">{t("details.kpis.avgDaily")}</div>
                <div className="forecast-mini-value">{fmtNumber(detail?.summary?.avg_daily_quantity)}</div>
              </div>

              <div className="forecast-mini-card">
                <div className="forecast-mini-label">{t("details.kpis.totalRevenue")}</div>
                <div className="forecast-mini-value">{fmtCurrency(detail?.summary?.total_revenue)}</div>
              </div>

              <div className="forecast-mini-card">
                <div className="forecast-mini-label">{t("details.kpis.confidence")}</div>
                <div className="forecast-mini-value">{detail?.summary?.confidence || "—"}</div>
              </div>
            </div>

            <div className="forecast-detail-meta">
              <span className="forecast-chip">{t("details.meta.modelTier")}: {detail?.model?.tier || "—"}</span>
              <span className="forecast-chip">{t("details.meta.trainedAt")}: {detail?.model?.trained_at || "—"}</span>
              <span className="forecast-chip">{t("details.meta.trainingPeriod")}: {detail?.model?.training_period || "—"}</span>
              <span className="forecast-chip">{t("details.meta.eventBoosts")}: {detail?.summary?.has_event_boosts ? t("details.meta.yes") : t("details.meta.no")}</span>
            </div>

            <div className="forecast-chart-card">
              <div className="forecast-chart-title">{t("details.charts.dailyTitle")}</div>
              <div className="forecast-chart-wrap">
                <Line data={dailyChart.data} options={dailyChart.options} />
              </div>
            </div>

            <div className="forecast-chart-card">
              <div className="forecast-chart-title">{t("details.charts.weeklyTitle")}</div>
              <div className="forecast-chart-wrap forecast-chart-wrap-sm">
                <Bar data={weeklyRevenueChart.data} options={weeklyRevenueChart.options} />
              </div>
            </div>

            <div className="forecast-explainer">
              <div className="forecast-chart-title">{t("details.explanation.title")}</div>
              <p>{t("details.explanation.body1")}</p>
              <p>{t("details.explanation.body2", {
                peakDate: detail?.summary?.peak_date || "—",
                peakQty: fmtNumber(detail?.summary?.peak_quantity),
              })}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
