// frontend/src/features/forecasting/hooks/useForecastBulkGeneration.js
import { useEffect, useMemo, useState } from "react";

import { generateForecast } from "../../../api/forecasts";
import {
  isLikelyNoDataMessage,
  normalizeStatus,
  shouldRetrainForecast,
  shouldShowRegenerate,
} from "../utils/forecastingUtils";

const getProductId = (product) => {
  const id = Number(product?.product_id ?? product?.id);
  return Number.isFinite(id) ? id : null;
};

export function useForecastBulkGeneration({
  filtered,
  effectiveStatusMap,
  rowBusy,
  setRowBusy,
  setPendingForecasts,
  loadData,
  setErr,
  setInfo,
  tRef,
}) {
  const [selectedForecastIds, setSelectedForecastIds] = useState([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const visibleGeneratableProductIds = useMemo(() => {
    return filtered
      .filter((product) => {
        const productId = getProductId(product);
        if (productId == null) return false;

        const row = effectiveStatusMap?.[productId] || {};
        const status = normalizeStatus(row?.status);
        const totalSales = Number(product?.stats?.total_sales || 0);
        const needsUpload =
          totalSales <= 0 || isLikelyNoDataMessage(row?.error);

        if (needsUpload || rowBusy[productId]) return false;
        if (shouldShowRegenerate(product, row)) return true;

        return status !== "ready" && status !== "training";
      })
      .map(getProductId)
      .filter((id) => id != null);
  }, [filtered, effectiveStatusMap, rowBusy]);

  useEffect(() => {
    const allowed = new Set(visibleGeneratableProductIds.map(String));

    setSelectedForecastIds((previous) =>
      previous.filter((id) => allowed.has(String(id))),
    );
  }, [visibleGeneratableProductIds]);

  const allVisibleForecastsSelected =
    visibleGeneratableProductIds.length > 0 &&
    selectedForecastIds.length === visibleGeneratableProductIds.length;

  const handleToggleForecastSelection = (productId) => {
    const safeId = Number(productId);
    if (!Number.isFinite(safeId)) return;

    setSelectedForecastIds((previous) => {
      if (previous.includes(safeId)) {
        return previous.filter((id) => id !== safeId);
      }

      return [...previous, safeId];
    });
  };

  const handleToggleSelectAllForecasts = () => {
    setSelectedForecastIds((previous) => {
      if (previous.length === visibleGeneratableProductIds.length) {
        return [];
      }

      return visibleGeneratableProductIds;
    });
  };

  const handleGenerateSelectedForecasts = async () => {
    const selectedSet = new Set(selectedForecastIds.map(String));

    const productsToGenerate = filtered.filter((product) => {
      const productId = getProductId(product);
      return productId != null && selectedSet.has(String(productId));
    });

    if (!productsToGenerate.length) return;

    const ids = productsToGenerate.map(getProductId).filter(Boolean);

    setBulkGenerating(true);
    setErr("");
    setInfo({
      type: "info",
      text: tRef.current("messages.bulkGenerateAccepted", {
        count: productsToGenerate.length,
        defaultValue: `Starting forecasts for ${productsToGenerate.length} product(s). This may take a little while.`,
      }),
    });

    setPendingForecasts((previous) => {
      const next = { ...previous };

      ids.forEach((id) => {
        next[id] = Date.now();
      });

      return next;
    });

    setRowBusy((previous) => {
      const next = { ...previous };

      ids.forEach((id) => {
        next[id] = true;
      });

      return next;
    });

    const failed = [];

    for (const product of productsToGenerate) {
      const productId = getProductId(product);
      if (productId == null) continue;

      const row = effectiveStatusMap?.[productId] || {};

      try {
        await generateForecast({
          productId,
          retrain: shouldRetrainForecast(product, row),
        });
      } catch {
        failed.push(product?.product_name || `Product #${productId}`);

        setPendingForecasts((previous) => {
          const next = { ...previous };
          delete next[productId];
          return next;
        });
      }
    }

    setRowBusy((previous) => {
      const next = { ...previous };

      ids.forEach((id) => {
        next[id] = false;
      });

      return next;
    });

    setSelectedForecastIds([]);
    setBulkGenerating(false);

    await loadData();

    if (failed.length) {
      setErr(
        tRef.current("messages.bulkGenerateFailed", {
          count: failed.length,
          defaultValue: `Could not start ${failed.length} forecast(s). You can try again for those products.`,
        }),
      );
    }
  };

  return {
    selectedForecastIds,
    visibleGeneratableProductIds,
    allVisibleForecastsSelected,
    bulkGenerating,
    handleToggleForecastSelection,
    handleToggleSelectAllForecasts,
    handleGenerateSelectedForecasts,
  };
}