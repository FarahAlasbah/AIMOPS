// frontend/src/features/forecasting/pages/ForecastingPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Bar, Line } from "react-chartjs-2";

import { Button, Card, FormSelect, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { getProducts } from "../../../api/products";
import {
  generateForecast,
  getForecastStatuses,
  getProductForecast,
} from "../../../api/forecasts";
import { watchForecastProducts } from "../../../shared/utils/forecastNotifications";

import "./ForecastingPage.css";

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

const buildStatusMap = (models = []) => {
  const map = {};

  for (const model of Array.isArray(models) ? models : []) {
    if (model?.product_id == null) continue;

    map[model.product_id] = {
      ...model,
      status: normalizeStatus(model?.status),
    };
  }

  return map;
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

function ForecastStatusChip({ status, t }) {
  const safe = normalizeStatus(status);

  return (
    <span className={`forecast-status-chip ${safe}`}>
      {safe === "ready"
        ? t("table.ready")
        : safe === "training"
        ? t("table.training")
        : safe === "failed"
        ? t("table.failed")
        : t("table.notStarted")}
    </span>
  );
}

function ForecastTableSkeleton({ rows = 8 }) {
  return (
    <div className="forecast-skeleton-wrap">
      <div className="forecast-sk-table">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="forecast-sk-row">
            <div>
              <div className="forecast-sk-line" style={{ width: "72%", marginBottom: 8 }} />
              <div className="forecast-sk-line" style={{ width: "44%" }} />
            </div>

            <div className="forecast-sk-line" style={{ width: "66%" }} />
            <div>
              <div className="forecast-sk-line" style={{ width: "52%", marginBottom: 8 }} />
              <div className="forecast-sk-line" style={{ width: "78%" }} />
            </div>
            <div className="forecast-sk-line" style={{ width: "60%" }} />

            <div className="forecast-sk-actions">
              <div className="forecast-sk-pill" />
              <div className="forecast-sk-pill" style={{ width: 140 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastDetailsSkeleton() {
  return (
    <>
      <div className="forecast-meta-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="forecast-meta-card">
            <div className="forecast-sk-line" style={{ width: "42%", marginBottom: 10 }} />
            <div className="forecast-sk-line" style={{ width: "74%" }} />
          </div>
        ))}
      </div>

      <div className="forecast-chart-grid">
        <div className="forecast-chart-card">
          <div className="forecast-sk-line" style={{ width: 180, marginBottom: 10 }} />
          <div className="forecast-sk-line" style={{ width: "54%", marginBottom: 14 }} />
          <div className="forecast-sk-box" style={{ height: 320 }} />
        </div>

        <div className="forecast-chart-card">
          <div className="forecast-sk-line" style={{ width: 160, marginBottom: 10 }} />
          <div className="forecast-sk-line" style={{ width: "46%", marginBottom: 14 }} />
          <div className="forecast-sk-box" style={{ height: 280 }} />
        </div>
      </div>

      <div className="forecast-explanation-card">
        <div className="forecast-sk-line" style={{ width: 140, marginBottom: 12 }} />
        <div className="forecast-sk-line" style={{ width: "100%", marginBottom: 10 }} />
        <div className="forecast-sk-line" style={{ width: "94%", marginBottom: 10 }} />
        <div className="forecast-sk-line" style={{ width: "82%" }} />
      </div>
    </>
  );
}

function ForecastModal({
  open,
  onClose,
  forecastData,
  loading,
  error,
  days,
  onDaysChange,
  locale,
}) {
  const { t } = useTranslation("forecasting");

  if (!open) return null;

  const daily = Array.isArray(forecastData?.daily) ? forecastData.daily : [];
  const weekly = Array.isArray(forecastData?.weekly_summary) ? forecastData.weekly_summary : [];

  const hasBounds = daily.some(
    (item) =>
      item?.quantity_lower != null ||
      item?.quantity_upper != null
  );

  const quantityLabels = daily.map((item) => fmtDate(item?.date, locale));

  const dailyChartData = {
    labels: quantityLabels,
    datasets: [
      {
        label: t("modal.datasets.quantity"),
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
              label: t("modal.datasets.upper"),
              data: daily.map((item) =>
                item?.quantity_upper == null ? null : Number(item.quantity_upper)
              ),
              borderColor: "rgba(37, 99, 235, 0.35)",
              backgroundColor: "transparent",
              borderDash: [6, 6],
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.3,
            },
            {
              label: t("modal.datasets.lower"),
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

  const dailyChartOptions = {
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
        ticks: { maxRotation: 0, minRotation: 0 },
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

  const hasWeeklyRevenue = weekly.some((item) => Number(item?.revenue || 0) > 0);

  const weeklyChartData = {
    labels: weekly.map((item) => fmtDate(item?.week_start, locale)),
    datasets: [
      {
        label: hasWeeklyRevenue
          ? t("modal.datasets.weeklyRevenue")
          : t("modal.datasets.weeklyQuantity"),
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

  const weeklyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 12,
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${fmtNumber(ctx.parsed.y, locale)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => fmtNumber(value, locale),
        },
      },
    },
  };

  const explanation = forecastData?.summary
    ? t("modal.explanationBody", {
        quantity: fmtNumber(forecastData.summary.total_quantity, locale),
        days: forecastData?.forecast_period?.days || Number(days),
        avg: fmtNumber(forecastData.summary.avg_daily_quantity, locale),
        peakDate: fmtDate(forecastData.summary.peak_date, locale),
        revenue: fmtMoney(forecastData.summary.total_revenue, locale),
      })
    : "";

  return (
    <div
      className="forecast-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("modal.title")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="forecast-modal-card">
        <div className="forecast-modal-head">
          <div>
            <div className="forecast-modal-title">{t("modal.title")}</div>
            <div className="forecast-modal-sub">
              {forecastData?.product_name || "—"}
            </div>
          </div>

          <div className="forecast-modal-actions">
            <FormSelect
              label={t("modal.daysLabel")}
              options={[
                { value: "30", label: t("modal.days30") },
                { value: "60", label: t("modal.days60") },
                { value: "90", label: t("modal.days90") },
              ]}
              value={String(days)}
              onChange={(e) => onDaysChange?.(e.target.value)}
            />

            <button
              type="button"
              className="forecast-close-x"
              onClick={onClose}
              aria-label={t("actions.close")}
            >
              ×
            </button>
          </div>
        </div>

        <div className="forecast-modal-body">
          {loading ? (
            <ForecastDetailsSkeleton />
          ) : error ? (
            <InfoMessage type="error">{error}</InfoMessage>
          ) : !forecastData?.success ? (
            <InfoMessage type="warning">{t("modal.noChartData")}</InfoMessage>
          ) : (
            <>
              <div className="forecast-meta-grid">
                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.summaryQuantity")}</div>
                  <div className="forecast-meta-value">
                    {fmtNumber(forecastData?.summary?.total_quantity, locale)}
                  </div>
                </div>

                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.summaryAvg")}</div>
                  <div className="forecast-meta-value">
                    {fmtNumber(forecastData?.summary?.avg_daily_quantity, locale)}
                  </div>
                </div>

                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.summaryPeak")}</div>
                  <div className="forecast-meta-value">
                    {fmtDate(forecastData?.summary?.peak_date, locale)}
                  </div>
                </div>

                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.summaryRevenue")}</div>
                  <div className="forecast-meta-value">
                    {fmtMoney(forecastData?.summary?.total_revenue, locale)}
                  </div>
                </div>

                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.summaryConfidence")}</div>
                  <div className="forecast-meta-value">
                    {String(forecastData?.summary?.confidence || "—")}
                  </div>
                </div>
              </div>

              <div className="forecast-meta-grid" style={{ marginTop: 0 }}>
                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.metaProduct")}</div>
                  <div className="forecast-meta-value">{forecastData?.product_name || "—"}</div>
                </div>

                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.metaCategory")}</div>
                  <div className="forecast-meta-value">{forecastData?.category || "—"}</div>
                </div>

                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.metaModel")}</div>
                  <div className="forecast-meta-value">
                    {forecastData?.model?.tier || "—"}
                  </div>
                </div>

                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.metaTrained")}</div>
                  <div className="forecast-meta-value">
                    {fmtDateTime(forecastData?.model?.trained_at, locale)}
                  </div>
                </div>

                <div className="forecast-meta-card">
                  <div className="forecast-meta-label">{t("modal.metaPeriod")}</div>
                  <div className="forecast-meta-value">
                    {forecastData?.forecast_period?.start || "—"} →{" "}
                    {forecastData?.forecast_period?.end || "—"}
                  </div>
                </div>
              </div>

              <div className="forecast-chart-grid">
                <div className="forecast-chart-card">
                  <div className="forecast-chart-title">{t("modal.dailyTitle")}</div>
                  <div className="forecast-chart-sub">{t("modal.dailySubtitle")}</div>

                  <div className="forecast-chart-area">
                    <Line data={dailyChartData} options={dailyChartOptions} />
                  </div>
                </div>

                <div className="forecast-chart-card">
                  <div className="forecast-chart-title">{t("modal.weeklyTitle")}</div>
                  <div className="forecast-chart-sub">
                    {hasWeeklyRevenue
                      ? t("modal.weeklySubtitleRevenue")
                      : t("modal.weeklySubtitleQuantity")}
                  </div>

                  <div className="forecast-chart-area small">
                    <Bar data={weeklyChartData} options={weeklyChartOptions} />
                  </div>
                </div>
              </div>

              <div className="forecast-explanation-card">
                <div className="forecast-chart-title">{t("modal.explanationTitle")}</div>
                <div className="forecast-explanation-text">{explanation}</div>
              </div>
            </>
          )}
        </div>

        <div className="forecast-modal-foot">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("actions.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ForecastingPage() {
  const { t, i18n } = useTranslation("forecasting");
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [info, setInfo] = useState(null);

  const [products, setProducts] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [statusSummary, setStatusSummary] = useState(null);

  const [search, setSearch] = useState("");
  const [rowBusy, setRowBusy] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [modalDays, setModalDays] = useState("30");
  const [forecastDetails, setForecastDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const syncStatuses = useCallback(async () => {
    try {
      const res = await getForecastStatuses();
      setStatusMap(buildStatusMap(res?.models));
      setStatusSummary(res?.summary || null);
    } catch {
      // fail softly; table can still work from products endpoint
    }
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setPageError("");
    setInfo(null);

    try {
      const [productsRes, statusRes] = await Promise.all([
        getProducts(),
        getForecastStatuses().catch(() => null),
      ]);

      const list = Array.isArray(productsRes?.products) ? productsRes.products : [];
      setProducts(list);

      if (statusRes) {
        setStatusMap(buildStatusMap(statusRes?.models));
        setStatusSummary(statusRes?.summary || null);
      } else {
        setStatusMap({});
        setStatusSummary(null);
      }
    } catch (err) {
      setPageError(err?.message || t("messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    const id = window.setInterval(syncStatuses, POLL_MS);
    return () => window.clearInterval(id);
  }, [syncStatuses]);

  const trainingIds = useMemo(() => {
    return Object.values(statusMap)
      .filter((row) => normalizeStatus(row?.status) === "training")
      .map((row) => Number(row?.product_id))
      .filter((id) => !Number.isNaN(id));
  }, [statusMap]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!q) return true;

      const haystack = [
        product?.product_name,
        product?.normalized_name,
        product?.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [products, search]);

  const orderedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) =>
      String(a?.product_name || "").localeCompare(String(b?.product_name || ""))
    );
  }, [filteredProducts]);

  const loadForecastDetails = useCallback(
    async (productId, days) => {
      setDetailsLoading(true);
      setDetailsError("");

      try {
        const res = await getProductForecast(productId, { days: Number(days) || 30 });
        setForecastDetails(res);
      } catch (err) {
        setDetailsError(err?.message || t("messages.detailsFailed"));
      } finally {
        setDetailsLoading(false);
      }
    },
    [t]
  );

  const handleOpenForecast = async (product) => {
    setModalProduct(product);
    setModalOpen(true);
    setForecastDetails(null);
    await loadForecastDetails(product?.product_id, modalDays);
  };

  useEffect(() => {
    if (!modalOpen || !modalProduct?.product_id) return;
    loadForecastDetails(modalProduct.product_id, modalDays);
  }, [modalDays, modalOpen, modalProduct, loadForecastDetails]);

  const handleGenerate = async (product, { retrain = false } = {}) => {
    const productId = Number(product?.product_id);
    if (Number.isNaN(productId)) return;

    setInfo(null);
    setRowBusy((prev) => ({ ...prev, [productId]: true }));

    try {
      const res = await generateForecast({ productId, retrain });

      setInfo({
        type: "success",
        text:
          res?.message ||
          t("messages.generateAccepted", { name: product?.product_name || "#" + productId }),
      });

      setStatusMap((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          product_id: productId,
          product_name: product?.product_name,
          status: normalizeStatus(res?.model_status || "training"),
          trained_at: res?.trained_at || prev?.[productId]?.trained_at || null,
          error: null,
        },
      }));

      await syncStatuses();
    } catch (err) {
      setInfo({
        type: "error",
        text:
          err?.message ||
          t("messages.generateFailed", { name: product?.product_name || "#" + productId }),
      });

      setStatusMap((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          product_id: productId,
          product_name: product?.product_name,
          status: "failed",
          error: err?.message || "",
        },
      }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const goToDashboardAndWatch = () => {
    const watchItems = orderedProducts
      .filter((product) => {
        const row = statusMap[product?.product_id];
        return normalizeStatus(row?.status) === "training";
      })
      .map((product) => ({
        product_id: Number(product.product_id),
        product_name: product.product_name,
      }));

    if (watchItems.length > 0) {
      watchForecastProducts(watchItems);
      setInfo({ type: "info", text: t("messages.watchSaved") });
    }

    navigate("/app/overview");
  };

  const actionForRow = (product) => {
    const productId = Number(product?.product_id);
    const totalSales = Number(product?.stats?.total_sales || 0);
    const rowStatus = normalizeStatus(statusMap?.[productId]?.status);
    const busy = !!rowBusy[productId];
    const hasData = totalSales > 0;

    if (rowStatus === "ready") {
      return (
        <>
          <ForecastStatusChip status="ready" t={t} />
          <Button type="button" onClick={() => handleOpenForecast(product)}>
            {t("actions.view")}
          </Button>
        </>
      );
    }

    if (rowStatus === "training" || busy) {
      return (
        <>
          <ForecastStatusChip status="training" t={t} />
          <Button type="button" disabled>
            {busy ? t("actions.generating") : t("actions.training")}
          </Button>
        </>
      );
    }

    if (rowStatus === "failed") {
      return (
        <>
          <ForecastStatusChip status="failed" t={t} />
          <Button type="button" variant="secondary" onClick={() => handleGenerate(product, { retrain: true })}>
            {t("actions.retry")}
          </Button>
          {statusMap?.[productId]?.error ? (
            <div className="forecast-error-text">{statusMap[productId].error}</div>
          ) : null}
        </>
      );
    }

    return (
      <>
        <ForecastStatusChip status="idle" t={t} />
        <Button
          type="button"
          onClick={() => handleGenerate(product)}
          disabled={!hasData}
          title={!hasData ? t("table.noData") : ""}
        >
          {t("actions.generate")}
        </Button>
        {!hasData ? (
          <div className="forecast-disabled-note">{t("table.noData")}</div>
        ) : null}
      </>
    );
  };

  return (
    <div className="forecasting-page">
      <PageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle")}
      />

      {pageError ? <InfoMessage type="error">{pageError}</InfoMessage> : null}
      {info ? <InfoMessage type={info.type}>{info.text}</InfoMessage> : null}

      {statusSummary ? (
        <div className="forecast-summary-grid">
          <div className="forecast-summary-card">
            <div className="forecast-summary-label">{t("summary.total")}</div>
            <div className="forecast-summary-value">
              {fmtNumber(statusSummary?.total_products, locale)}
            </div>
          </div>

          <div className="forecast-summary-card">
            <div className="forecast-summary-label">{t("summary.ready")}</div>
            <div className="forecast-summary-value">
              {fmtNumber(statusSummary?.ready, locale)}
            </div>
          </div>

          <div className="forecast-summary-card">
            <div className="forecast-summary-label">{t("summary.training")}</div>
            <div className="forecast-summary-value">
              {fmtNumber(statusSummary?.training, locale)}
            </div>
          </div>

          <div className="forecast-summary-card">
            <div className="forecast-summary-label">{t("summary.failed")}</div>
            <div className="forecast-summary-value">
              {fmtNumber(statusSummary?.failed, locale)}
            </div>
          </div>
        </div>
      ) : null}

      {trainingIds.length > 0 ? (
        <div className="forecast-watch-banner">
          <InfoMessage type="info">
            {t("messages.watchNotice", { count: trainingIds.length })}
          </InfoMessage>

          <div className="forecast-watch-actions">
            <Button type="button" variant="secondary">
              {t("actions.stayHere")}
            </Button>
            <Button type="button" onClick={goToDashboardAndWatch}>
              {t("actions.goDashboard")}
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="no-padding">
        <div className="forecast-toolbar">
          <div className="forecast-toolbar-left">
            <div className="forecast-field">
              <label>{t("toolbar.searchLabel")}</label>
              <input
                className="forecast-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("toolbar.searchPlaceholder")}
              />
            </div>
          </div>

          <div className="forecast-toolbar-right">
            <div className="forecast-results">
              {t("toolbar.results", { count: orderedProducts.length })}
            </div>

            <Button type="button" variant="secondary" onClick={loadPage}>
              {t("toolbar.refresh")}
            </Button>
          </div>
        </div>

        {loading ? (
          <ForecastTableSkeleton />
        ) : (
          <div className="forecast-table-wrap">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>{t("table.colProduct")}</th>
                  <th>{t("table.colCategory")}</th>
                  <th>{t("table.colDataAvailable")}</th>
                  <th>{t("table.colRevenue")}</th>
                  <th>{t("table.colAction")}</th>
                </tr>
              </thead>

              <tbody>
                {orderedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="forecast-empty">
                      {t("table.empty")}
                    </td>
                  </tr>
                ) : (
                  orderedProducts.map((product) => {
                    const totalSales = Number(product?.stats?.total_sales || 0);
                    const totalRevenue = Number(product?.stats?.total_revenue || 0);
                    const lastSale = product?.stats?.last_sale || null;

                    return (
                      <tr key={product?.product_id}>
                        <td>
                          <div className="forecast-name">
                            {product?.product_name || `#${product?.product_id}`}
                          </div>
                          <div className="forecast-sub">
                            {product?.normalized_name || "—"}
                          </div>
                        </td>

                        <td>
                          <div className="forecast-name">{product?.category || "—"}</div>
                        </td>

                        <td>
                          <div className="forecast-data-stack">
                            <div className="forecast-name">
                              {totalSales > 0
                                ? t("table.salesRecords", { count: totalSales })
                                : t("table.noData")}
                            </div>
                            <div className="forecast-sub">
                              {lastSale
                                ? t("table.lastSale", { date: fmtDate(lastSale, locale) })
                                : "—"}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="forecast-money">{fmtMoney(totalRevenue, locale)}</div>
                        </td>

                        <td>
                          <div className="forecast-action-stack">{actionForRow(product)}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ForecastModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        forecastData={forecastDetails}
        loading={detailsLoading}
        error={detailsError}
        days={modalDays}
        onDaysChange={setModalDays}
        locale={locale}
      />
    </div>
  );
}