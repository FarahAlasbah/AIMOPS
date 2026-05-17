// frontend/src/features/forecasting/hooks/useForecastingPage.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getProducts } from "../../../api/products";
import { generateForecast, getForecastStatuses } from "../../../api/forecasts";
import { watchForecastProducts } from "../../../shared/utils/forecastNotifications";

import { useForecastBulkGeneration } from "./useForecastBulkGeneration";
import { useLatestValueRef } from "./useLatestValueRef";
import {
  isForecastOutdated,
  normalizeStatus,
  POLL_MS,
  toDateKey,
} from "../utils/forecastingUtils";

const FAILED_PENDING_GRACE_MS = 10000;
const LOCAL_PENDING_MAX_MS = 15000;

export function useForecastingPage() {
  const { t, i18n } = useTranslation("forecasting");
  const tRef = useLatestValueRef(t);
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
  const [pendingForecasts, setPendingForecasts] = useState({});

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

        if (!statusRes) {
          setStatusMap({});
          return;
        }

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
      } catch (e) {
        setErr(e?.message || tRef.current("messages.loadFailed"));
      } finally {
        setLoading(false);

        if (showSkeleton) {
          setRefreshing(false);
        }
      }
    },
    [tRef],
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

  useEffect(() => {
    setPendingForecasts((previous) => {
      const now = Date.now();
      const next = {};

      for (const [productId, startedAt] of Object.entries(previous)) {
        const serverRow = statusMap?.[productId] || {};
        const serverStatus = normalizeStatus(serverRow?.status);
        const age = now - Number(startedAt || now);

        if (serverStatus === "ready") continue;
        if (serverStatus === "idle" && age > LOCAL_PENDING_MAX_MS) continue;
        if (serverStatus === "failed" && age > FAILED_PENDING_GRACE_MS) continue;
        if (age > LOCAL_PENDING_MAX_MS) continue;

        next[productId] = startedAt;
      }

      return next;
    });
  }, [statusMap]);

  const effectiveStatusMap = useMemo(() => {
    const next = { ...statusMap };
    const now = Date.now();

    for (const [productId, startedAt] of Object.entries(pendingForecasts)) {
      const serverRow = next?.[productId] || {};
      const serverStatus = normalizeStatus(serverRow?.status);
      const age = now - Number(startedAt || now);

      if (serverStatus === "ready") continue;
      if (serverStatus === "failed" && age > FAILED_PENDING_GRACE_MS) continue;
      if (age > LOCAL_PENDING_MAX_MS) continue;

      next[productId] = {
        ...serverRow,
        status: "training",
        locally_pending: true,
      };
    }

    return next;
  }, [statusMap, pendingForecasts]);

  const pageSkeleton = loading || refreshing;

  const handleRefresh = useCallback(() => {
    setPendingForecasts({});
    loadData({ showSkeleton: true });
  }, [loadData]);

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
      const status = normalizeStatus(effectiveStatusMap?.[productId]?.status);

      nextSummary[status] += 1;
    }

    return nextSummary;
  }, [products, effectiveStatusMap]);

  const categories = useMemo(() => {
    const set = new Set();

    for (const product of products) {
      if (product?.category) set.add(String(product.category));
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
      { value: "dateDesc", label: t("toolbar.sortLastSale") },
      { value: "categoryAsc", label: t("toolbar.sortCategory") },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    const next = products.filter((product) => {
      const productId = Number(product?.product_id ?? product?.id);
      const name = String(product?.product_name || "");
      const normalized = String(product?.normalized_name || "");
      const cat = String(product?.category || "");
      const row = effectiveStatusMap?.[productId] || {};
      const status = normalizeStatus(row?.status);
      const lastSaleKey = toDateKey(product?.stats?.last_sale);

      if (qq) {
        const haystack = `${name} ${normalized} ${cat}`.toLowerCase();
        if (!haystack.includes(qq)) return false;
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
          return (
            aCategory.localeCompare(bCategory) || aName.localeCompare(bName)
          );

        case "nameAsc":
        default:
          return aName.localeCompare(bName);
      }
    });

    return next;
  }, [
    products,
    q,
    category,
    statusFilter,
    dateFilter,
    sortKey,
    effectiveStatusMap,
  ]);

  const trainingProducts = useMemo(() => {
    return products.filter((product) => {
      const productId = Number(product?.product_id ?? product?.id);
      return (
        normalizeStatus(effectiveStatusMap?.[productId]?.status) === "training"
      );
    });
  }, [products, effectiveStatusMap]);

  const bulk = useForecastBulkGeneration({
    filtered,
    effectiveStatusMap,
    rowBusy,
    setRowBusy,
    setPendingForecasts,
    loadData,
    setErr,
    setInfo,
    tRef,
  });

  const handleGenerate = async (product, retrain = false) => {
    const productId = Number(product?.product_id ?? product?.id);
    if (Number.isNaN(productId)) return;

    const row = effectiveStatusMap?.[productId] || {};
    const shouldRetrain = retrain || isForecastOutdated(product, row);

    setPendingForecasts((previous) => ({
      ...previous,
      [productId]: Date.now(),
    }));

    setRowBusy((previous) => ({
      ...previous,
      [productId]: true,
    }));

    setErr("");
    setInfo(null);

    try {
      await generateForecast({
        productId,
        retrain: shouldRetrain,
      });

      await loadData();
    } catch (e) {
      setPendingForecasts((previous) => {
        const next = { ...previous };
        delete next[productId];
        return next;
      });

      setErr(
        e?.message ||
          tRef.current("messages.generateFailed", {
            name:
              product?.product_name ||
              tRef.current("details.productFallback", { id: productId }),
          }),
      );
    } finally {
      setRowBusy((previous) => ({
        ...previous,
        [productId]: false,
      }));
    }
  };

  const handleGoDashboard = () => {
    const items = trainingProducts.map((product) => ({
      product_id: Number(product.product_id),
      product_name: product.product_name,
    }));

    if (items.length) {
      watchForecastProducts(items);
      setInfo({ type: "info", text: tRef.current("messages.watchSaved") });
    }

    navigate("/app/overview");
  };

  const handleViewForecast = (productId) => {
    navigate(`/app/forecasting/${productId}`);
  };

  const handleUploadData = () => {
    navigate("/app/data-upload");
  };

  return {
    locale,

    loading,
    refreshing,
    pageSkeleton,
    err,
    info,

    q,
    setQ,
    category,
    setCategory,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    sortKey,
    setSortKey,

    summary,
    filtered,
    categories,
    statusOptions,
    sortOptions,
    statusMap: effectiveStatusMap,
    rowBusy,
    trainingProducts,

    handleRefresh,
    handleGenerate,
    handleGoDashboard,
    handleViewForecast,
    handleUploadData,

    ...bulk,
  };
}