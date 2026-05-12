// frontend/src/features/forecasting/pages/ForecastingPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { Button, Card, FormSelect, PageHeader } from "../../../shared/components";
import FormCalendar from "../../../shared/components/FormCalendar";
import InfoMessage from "../../../shared/components/InfoMessage";
import PageHelp from "../../../shared/components/PageHelp";

import { getProducts } from "../../../api/products";
import { generateForecast, getForecastStatuses } from "../../../api/forecasts";
import { watchForecastProducts } from "../../../shared/utils/forecastNotifications";

import "./ForecastingPage.css";

const POLL_MS = 4000;

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

const normalizeStatus = (value) => {
  const v = String(value || "").toLowerCase();

  if (["ready", "done", "success", "completed"].includes(v)) return "ready";
  if (["training", "queued", "pending", "running"].includes(v)) return "training";
  if (["failed", "error"].includes(v)) return "failed";

  return "idle";
};

const isLikelyNoDataMessage = (value) => {
  const text = String(value || "").toLowerCase();
  return NO_DATA_HINTS.some((token) => text.includes(token));
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

const toDateKey = (value) => {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

function ForecastSummarySkeleton() {
  return (
    <div className="forecast-summary-row">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="forecast-summary-card">
          <div className="forecast-sk" style={{ width: "42%", height: 12 }} />
          <div
            className="forecast-sk"
            style={{ width: "58%", height: 30, marginTop: 16 }}
          />
        </div>
      ))}
    </div>
  );
}

function ForecastControlsSkeleton() {
  return (
    <div className="forecast-controls">
      <div className="forecast-controls-top">
        <div
          className="forecast-sk"
          style={{ width: 130, height: 42, borderRadius: 999 }}
        />
        <div
          className="forecast-sk"
          style={{ width: 42, height: 42, borderRadius: 14 }}
        />
      </div>

      <div className="forecast-search-block">
        <div className="forecast-sk" style={{ width: 90, height: 12 }} />
        <div
          className="forecast-sk"
          style={{
            width: "100%",
            maxWidth: 420,
            height: 42,
            marginTop: 8,
            borderRadius: 12,
          }}
        />
      </div>

      <div className="forecast-filters-block">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="forecast-field">
            <div className="forecast-sk" style={{ width: "36%", height: 12 }} />
            <div
              className="forecast-sk"
              style={{ width: "100%", height: 42, marginTop: 8, borderRadius: 12 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastTableSkeleton({ rows = 8 }) {
  return (
    <div className="forecast-skeleton-wrap">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="forecast-skeleton-row">
          <div className="forecast-skeleton-stack">
            <div className="forecast-sk" style={{ width: "70%" }} />
            <div className="forecast-sk" style={{ width: "45%" }} />
          </div>

          <div className="forecast-sk" style={{ width: "60%" }} />

          <div className="forecast-skeleton-stack">
            <div className="forecast-sk" style={{ width: "52%" }} />
            <div className="forecast-sk" style={{ width: "78%" }} />
          </div>

          <div className="forecast-sk" style={{ width: "58%" }} />

          <div className="forecast-skeleton-stack">
            <div className="forecast-sk" style={{ width: "72%" }} />
            <div className="forecast-sk" style={{ width: "50%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ForecastChip({ status, t }) {
  const safe = normalizeStatus(status);

  return (
    <span className={`forecast-chip ${safe}`}>
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

export default function ForecastingPage() {
  const { t, i18n } = useTranslation("forecasting");
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(null);

  const [products, setProducts] = useState([]);
  const [statusMap, setStatusMap] = useState({});

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortKey, setSortKey] = useState("nameAsc");

  const [rowBusy, setRowBusy] = useState({});

  const loadData = useCallback(
    async ({ showSkeleton = false } = {}) => {
      if (showSkeleton) {
        setRefreshing(true);
        setInfo(null);
      }

      setErr("");

      try {
        const [productsRes, statusRes] = await Promise.all([
          getProducts(),
          getForecastStatuses().catch(() => null),
        ]);

        const list = Array.isArray(productsRes?.products)
          ? productsRes.products
          : Array.isArray(productsRes)
            ? productsRes
            : [];

        setProducts(list);

        const existingProductIds = new Set(
          list
            .map((product) => Number(product?.product_id ?? product?.id))
            .filter((id) => Number.isFinite(id)),
        );

        if (statusRes) {
          const models = Array.isArray(statusRes?.models)
            ? statusRes.models
            : Array.isArray(statusRes?.products)
              ? statusRes.products
              : Array.isArray(statusRes)
                ? statusRes
                : [];

          const nextMap = {};

          for (const model of models) {
            const productId = Number(model?.product_id);

            if (!Number.isFinite(productId)) continue;
            if (!existingProductIds.has(productId)) continue;

            nextMap[productId] = {
              ...model,
              status: normalizeStatus(model?.status || model?.forecast_status),
            };
          }

          setStatusMap(nextMap);
        } else {
          setStatusMap({});
        }
      } catch (e) {
        setErr(e?.message || t("messages.loadFailed"));
      } finally {
        setLoading(false);

        if (showSkeleton) {
          setRefreshing(false);
        }
      }
    },
    [t],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      loadData();
    }, POLL_MS);

    return () => window.clearInterval(id);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData({ showSkeleton: true });
  }, [loadData]);

  const pageSkeleton = loading || refreshing;

  const summary = useMemo(() => {
    const nextSummary = {
      total_products: products.length,
      ready: 0,
      training: 0,
      failed: 0,
      idle: 0,
    };

    for (const product of products) {
      const productId = Number(product?.product_id ?? product?.id);
      const status = normalizeStatus(statusMap?.[productId]?.status);

      nextSummary[status] += 1;
    }

    return nextSummary;
  }, [products, statusMap]);

  const categories = useMemo(() => {
    const set = new Set();

    for (const p of products) {
      if (p?.category) set.add(String(p.category));
    }

    return [
      { value: "all", label: t("toolbar.categoryAll") },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((item) => ({
          value: item,
          label: item,
        })),
    ];
  }, [products, t]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: t("toolbar.statusAll") },
      { value: "idle", label: t("toolbar.statusNotStarted") },
      { value: "training", label: t("toolbar.statusTraining") },
      { value: "ready", label: t("toolbar.statusReady") },
      { value: "failed", label: t("toolbar.statusFailed") },
    ],
    [t],
  );

  const sortOptions = useMemo(
    () => [
      { value: "nameAsc", label: t("toolbar.sortName") },
      { value: "revenueDesc", label: t("toolbar.sortRevenue") },
      { value: "dataDesc", label: t("toolbar.sortData") },
      {
        value: "dateDesc",
        label: t("toolbar.sortLastSale", { defaultValue: "Last sale" }),
      },
      { value: "categoryAsc", label: t("toolbar.sortCategory") },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    const next = products.filter((p) => {
      const productId = Number(p?.product_id);
      const name = String(p?.product_name || "");
      const normalized = String(p?.normalized_name || "");
      const cat = String(p?.category || "");
      const status = normalizeStatus(statusMap?.[productId]?.status);
      const lastSaleKey = toDateKey(p?.stats?.last_sale);

      if (qq) {
        const hay = `${name} ${normalized} ${cat}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }

      if (category !== "all" && cat !== category) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (dateFilter && lastSaleKey !== dateFilter) return false;

      return true;
    });

    next.sort((a, b) => {
      const aRevenue = Number(a?.stats?.total_revenue || 0);
      const bRevenue = Number(b?.stats?.total_revenue || 0);
      const aSales = Number(a?.stats?.total_sales || 0);
      const bSales = Number(b?.stats?.total_sales || 0);
      const aCategory = String(a?.category || "");
      const bCategory = String(b?.category || "");
      const aName = String(a?.product_name || "");
      const bName = String(b?.product_name || "");
      const aDate = new Date(a?.stats?.last_sale || 0).getTime();
      const bDate = new Date(b?.stats?.last_sale || 0).getTime();

      switch (sortKey) {
        case "revenueDesc":
          return bRevenue - aRevenue;

        case "dataDesc":
          return bSales - aSales;

        case "dateDesc":
          return bDate - aDate;

        case "categoryAsc":
          return aCategory.localeCompare(bCategory) || aName.localeCompare(bName);

        case "nameAsc":
        default:
          return aName.localeCompare(bName);
      }
    });

    return next;
  }, [products, q, category, statusFilter, dateFilter, sortKey, statusMap]);

  const trainingProducts = useMemo(() => {
    return products.filter(
      (p) => normalizeStatus(statusMap?.[p?.product_id]?.status) === "training",
    );
  }, [products, statusMap]);

  const handleGenerate = async (product, retrain = false) => {
    const productId = Number(product?.product_id);
    if (Number.isNaN(productId)) return;

    setRowBusy((prev) => ({ ...prev, [productId]: true }));
    setErr("");
    setInfo(null);

    try {
      const res = await generateForecast({ productId, retrain });

      setInfo({
        type: "success",
        text:
          res?.message ||
          t("messages.generateAccepted", {
            name: product?.product_name || `#${productId}`,
          }),
      });

      await loadData();
    } catch (e) {
      setErr(
        e?.message ||
          t("messages.generateFailed", {
            name: product?.product_name || `#${productId}`,
          }),
      );
    } finally {
      setRowBusy((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleGoDashboard = () => {
    const items = trainingProducts.map((p) => ({
      product_id: Number(p.product_id),
      product_name: p.product_name,
    }));

    if (items.length) {
      watchForecastProducts(items);
      setInfo({ type: "info", text: t("messages.watchSaved") });
    }

    navigate("/app/overview");
  };

  return (
    <div className="forecasting-page">
      <PageHeader
        
        actions={
          <PageHelp
            title="How to use Forecasting"
            buttonLabel="Open forecasting help"
            items={[
              {
                title: "1. Check product readiness",
                description:
                  "Each product has a forecast status. Not Started means no forecast exists yet, Training means AIMOPS is generating it, Ready means you can view the forecast, and Failed means you can retry.",
              },
              {
                title: "2. Generate forecasts",
                description:
                  "Click Generate for a product when it has enough sales history. AIMOPS uses uploaded sales data to estimate future demand.",
              },
              {
                title: "3. Upload data when needed",
                description:
                  "If a product has no sales history or not enough usable data, upload sales data first before generating a forecast.",
              },
              {
                title: "4. Wait while training finishes",
                description:
                  "Training can take a little time. You can stay on this page, or go back to the dashboard and AIMOPS will notify you when watched forecasts are ready.",
              },
              {
                title: "5. Open ready forecasts",
                description:
                  "When a forecast is Ready, click View to open the forecast details page with charts, summary numbers, confidence, and AI explanation.",
              },
              {
                title: "6. Retry failed forecasts",
                description:
                  "If a forecast fails, check the error message. Retry after uploading better data or after fixing the product sales history.",
              },
            ]}
            note="Tip: Forecast quality depends on clean product names and enough sales history. Merge duplicate products before forecasting when needed."
          />
        }
      />

      {pageSkeleton ? (
        <ForecastSummarySkeleton />
      ) : (
        <div className="forecast-summary-row">
          <div className="forecast-summary-card">
            <div className="forecast-summary-label">{t("summary.total")}</div>
            <div className="forecast-summary-value">
              {fmtNumber(summary.total_products, locale)}
            </div>
          </div>

          <div className="forecast-summary-card">
            <div className="forecast-summary-label">{t("summary.ready")}</div>
            <div className="forecast-summary-value">
              {fmtNumber(summary.ready, locale)}
            </div>
          </div>

          <div className="forecast-summary-card">
            <div className="forecast-summary-label">{t("summary.training")}</div>
            <div className="forecast-summary-value">
              {fmtNumber(summary.training, locale)}
            </div>
          </div>

          <div className="forecast-summary-card">
            <div className="forecast-summary-label">{t("summary.failed")}</div>
            <div className="forecast-summary-value">
              {fmtNumber(summary.failed, locale)}
            </div>
          </div>
        </div>
      )}

      {!pageSkeleton && trainingProducts.length > 0 ? (
        <div className="forecast-banner">
          <InfoMessage type="info">
            {t("messages.watchNotice", { count: trainingProducts.length })}
          </InfoMessage>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <Button type="button" variant="secondary">
              {t("actions.stayHere")}
            </Button>

            <Button type="button" onClick={handleGoDashboard}>
              {t("actions.goDashboard")}
            </Button>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="forecast-banner">
          <InfoMessage type="error">{err}</InfoMessage>
        </div>
      ) : null}

      {info && !pageSkeleton ? (
        <div className="forecast-banner">
          <InfoMessage type={info.type}>{info.text}</InfoMessage>
        </div>
      ) : null}

      <Card className="forecast-panel">
        {loading ? (
          <ForecastControlsSkeleton />
        ) : (
          <div className="forecast-controls">
            <div className="forecast-controls-top">
              <div className="forecast-results-pill">
                {refreshing
                  ? t("toolbar.refreshing", {
                      defaultValue: "Refreshing...",
                    })
                  : t("toolbar.results", { count: filtered.length })}
              </div>

              <button
                type="button"
                className="forecast-refresh-icon-btn"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                title={t("toolbar.refresh")}
                aria-label={t("toolbar.refresh")}
              >
                <RefreshCw
                  size={18}
                  className={loading || refreshing ? "spin-icon" : ""}
                />
              </button>
            </div>

            <div className="forecast-search-block">
              <label>{t("toolbar.searchLabel")}</label>

              <input
                className="forecast-text forecast-text-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("toolbar.searchPlaceholder")}
                disabled={refreshing}
              />
            </div>

            <div className="forecast-filters-block">
              <div className="forecast-field">
                <FormSelect
                  label={t("toolbar.categoryLabel")}
                  value={category}
                  onChange={(e) => setCategory(e.target.value || "all")}
                  options={categories}
                  disabled={refreshing}
                />
              </div>

              <div className="forecast-field">
                <FormSelect
                  label={t("toolbar.statusLabel")}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value || "all")}
                  options={statusOptions}
                  disabled={refreshing}
                />
              </div>

              <div className="forecast-field">
                <FormCalendar
                  label={t("toolbar.dateLabel", { defaultValue: "Date" })}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  disabled={refreshing}
                />
              </div>

              <div className="forecast-field">
                <FormSelect
                  label={t("toolbar.sortLabel")}
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value || "nameAsc")}
                  options={sortOptions}
                  disabled={refreshing}
                />
              </div>
            </div>
          </div>
        )}

        {pageSkeleton ? (
          <ForecastTableSkeleton />
        ) : (
          <div className="forecast-table-wrap">
            <table className="forecast-table">
              <colgroup>
                <col className="forecast-col-product" />
                <col className="forecast-col-category" />
                <col className="forecast-col-data" />
                <col className="forecast-col-revenue" />
                <col className="forecast-col-action" />
              </colgroup>

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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      {t("table.empty")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => {
                    const productId = Number(product?.product_id);
                    const row = statusMap?.[productId] || {};
                    const status = normalizeStatus(row?.status);
                    const totalSales = Number(product?.stats?.total_sales || 0);
                    const totalRevenue = Number(product?.stats?.total_revenue || 0);
                    const busy = !!rowBusy[productId];
                    const needsUpload =
                      totalSales <= 0 || isLikelyNoDataMessage(row?.error);

                    return (
                      <tr key={productId}>
                        <td className="forecast-name-cell">
                          <div className="name">
                            <bdi>{product?.product_name || `#${productId}`}</bdi>
                          </div>

                          <div className="sub">
                            <bdi>{product?.normalized_name || "—"}</bdi>
                          </div>
                        </td>

                        <td>
                          <bdi>{product?.category || "—"}</bdi>
                        </td>

                        <td>
                          <div>
                            {totalSales > 0
                              ? t("table.salesRecords", { count: totalSales })
                              : t("table.noData")}
                          </div>

                          <div className="forecast-note">
                            {product?.stats?.last_sale
                              ? t("table.lastSale", {
                                  date: fmtDate(product.stats.last_sale, locale),
                                })
                              : "—"}
                          </div>
                        </td>

                        <td>{fmtMoney(totalRevenue, locale)}</td>

                        <td>
                          <div className="forecast-actions">
                            <div className="forecast-action-row">
                              <ForecastChip status={status} t={t} />

                              {status === "ready" ? (
                                <Button
                                  type="button"
                                  onClick={() => navigate(`/app/forecasting/${productId}`)}
                                >
                                  {t("actions.view")}
                                </Button>
                              ) : status === "training" || busy ? (
                                <Button type="button" disabled>
                                  {busy ? t("actions.generating") : t("actions.training")}
                                </Button>
                              ) : needsUpload ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => navigate("/app/data-upload")}
                                >
                                  {t("actions.uploadData")}
                                </Button>
                              ) : status === "failed" ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => handleGenerate(product, true)}
                                >
                                  {t("actions.retry")}
                                </Button>
                              ) : (
                                <Button type="button" onClick={() => handleGenerate(product)}>
                                  {t("actions.generate")}
                                </Button>
                              )}
                            </div>

                            {status === "failed" && row?.error ? (
                              <div className="forecast-error-text">{row.error}</div>
                            ) : null}

                            {needsUpload ? (
                              <div className="forecast-warning-text">
                                {t("table.uploadHint")}
                              </div>
                            ) : null}
                          </div>
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
    </div>
  );
}