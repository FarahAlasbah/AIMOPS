import { useCallback, useEffect, useState } from "react";

import {
  deleteCampaign,
  getCampaignById,
  publishCampaign,
  recalculateCampaignForecast,
} from "../../../api/campaigns";
import { getForecastStatuses } from "../../../api/forecasts";
import { normalizeCampaignResponse } from "../utils";

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;

    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  if (typeof error?.response?.data?.message === "string") {
    return error.response.data.message;
  }

  if (typeof error?.message === "string") return error.message;

  return fallback;
}

function normalizeForecastStatus(value) {
  const status = String(value || "").toLowerCase();

  if (["ready", "done", "success", "completed"].includes(status)) {
    return "ready";
  }

  if (["training", "queued", "pending", "running"].includes(status)) {
    return "training";
  }

  if (["failed", "error"].includes(status)) {
    return "failed";
  }

  return "idle";
}

function getCampaignProductIds(campaign) {
  const rawProducts =
    campaign?.products ||
    campaign?.campaign_products ||
    campaign?.selected_products ||
    [];

  const idsFromObjects = Array.isArray(rawProducts)
    ? rawProducts
        .map((product) =>
          Number(product?.product_id ?? product?.productId ?? product?.id),
        )
        .filter((id) => Number.isFinite(id))
    : [];

  const idsFromArray = Array.isArray(campaign?.product_ids)
    ? campaign.product_ids
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    : [];

  return Array.from(new Set([...idsFromObjects, ...idsFromArray]));
}

function getForecastStatusList(response) {
  if (Array.isArray(response?.models)) return response.models;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response)) return response;

  return [];
}

function getInitialForecastReadiness() {
  return {
    loading: false,
    loaded: false,
    totalCount: 0,
    readyCount: 0,
    missingCount: 0,
  };
}

export function useCampaignDetails({ campaignId, navigate, t }) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
  const [forecastReadiness, setForecastReadiness] = useState(
    getInitialForecastReadiness,
  );

  const loadForecastReadinessForCampaign = useCallback(async (nextCampaign) => {
    const productIds = getCampaignProductIds(nextCampaign);

    if (!productIds.length) {
      setForecastReadiness({
        loading: false,
        loaded: true,
        totalCount: 0,
        readyCount: 0,
        missingCount: 0,
      });

      return;
    }

    setForecastReadiness({
      loading: true,
      loaded: false,
      totalCount: productIds.length,
      readyCount: 0,
      missingCount: 0,
    });

    try {
      const response = await getForecastStatuses();
      const statuses = getForecastStatusList(response);
      const productIdSet = new Set(productIds.map(String));
      const readyProductIds = new Set();

      statuses.forEach((item) => {
        const productId = Number(item?.product_id ?? item?.id);

        if (!Number.isFinite(productId)) return;
        if (!productIdSet.has(String(productId))) return;

        const status = normalizeForecastStatus(
          item?.status || item?.forecast_status || item?.model_status,
        );

        if (status === "ready") {
          readyProductIds.add(String(productId));
        }
      });

      setForecastReadiness({
        loading: false,
        loaded: true,
        totalCount: productIds.length,
        readyCount: readyProductIds.size,
        missingCount: Math.max(productIds.length - readyProductIds.size, 0),
      });
    } catch {
      setForecastReadiness({
        loading: false,
        loaded: false,
        totalCount: productIds.length,
        readyCount: 0,
        missingCount: 0,
      });
    }
  }, []);

  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;

    setLoading(true);
    setPageError("");
    setSuccessMessage("");
    setWarningMessage("");
    setForecastReadiness(getInitialForecastReadiness());

    try {
      const response = await getCampaignById(campaignId);
      const normalized = normalizeCampaignResponse(response);

      setCampaign(normalized);
      await loadForecastReadinessForCampaign(normalized);
    } catch (error) {
      setPageError(error.message || t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [campaignId, loadForecastReadinessForCampaign, t]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const closeConfirmModal = () => {
    if (busyAction) return;
    setConfirmAction("");
  };

  const handlePublish = async () => {
    setBusyAction("publish");
    setPageError("");
    setSuccessMessage("");
    setWarningMessage("");

    try {
      await publishCampaign(campaignId);

      setCampaign((prev) => ({
        ...prev,
        status: "active",
      }));

      setSuccessMessage(
        t("messages.publishSuccess", {
          defaultValue: "Campaign published successfully.",
        }),
      );

      setConfirmAction("");
    } catch (error) {
      setPageError(error.message || t("messages.publishError"));
    } finally {
      setBusyAction("");
    }
  };

  const handleDelete = async () => {
    setBusyAction("delete");
    setPageError("");
    setSuccessMessage("");
    setWarningMessage("");

    try {
      await deleteCampaign(campaignId);
      navigate("/app/campaigns");
    } catch (error) {
      setPageError(error.message || t("messages.deleteError"));
    } finally {
      setBusyAction("");
    }
  };

  const handleRecalculateForecast = async () => {
    setBusyAction("recalculate");
    setPageError("");
    setSuccessMessage("");
    setWarningMessage("");

    try {
      const response = await recalculateCampaignForecast(campaignId);

      const hasUsefulForecast =
        response?.forecast_uplift_pct !== null &&
        response?.forecast_uplift_pct !== undefined &&
        response?.forecast_additional_revenue !== null &&
        response?.forecast_additional_revenue !== undefined;

      setCampaign((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          forecast_uplift_pct: response?.forecast_uplift_pct,
          forecast_additional_revenue: response?.forecast_additional_revenue,
          predicted_roi: response?.predicted_roi,
          products_with_forecast: response?.products_with_forecast,
          products_without_forecast: response?.products_without_forecast,
          forecast_recalculate_note: response?.note,
        };
      });

      if (
        response?.products_with_forecast !== undefined ||
        response?.products_without_forecast !== undefined
      ) {
        const withForecast = Number(response?.products_with_forecast || 0);
        const withoutForecast = Number(response?.products_without_forecast || 0);

        setForecastReadiness({
          loading: false,
          loaded: true,
          totalCount: withForecast + withoutForecast,
          readyCount: withForecast,
          missingCount: withoutForecast,
        });
      }

      if (!hasUsefulForecast) {
        setWarningMessage(
          response?.message ||
            t("messages.forecastStillMissing", {
              defaultValue:
                "Forecast values are still not ready for this campaign.",
            }),
        );

        return;
      }

      setSuccessMessage(
        response?.message ||
          t("messages.forecastRecalculated", {
            defaultValue: "Forecast values were updated successfully.",
          }),
      );
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          t("messages.forecastRecalculateError", {
            defaultValue: "Could not recalculate forecast values.",
          }),
        ),
      );
    } finally {
      setBusyAction("");
    }
  };

  const handleConfirmAction = async () => {
    if (confirmAction === "publish") {
      await handlePublish();
      return;
    }

    if (confirmAction === "delete") {
      await handleDelete();
    }
  };

  const confirmTitle =
    confirmAction === "publish"
      ? t("dialogs.publishTitle")
      : t("dialogs.deleteTitle");

  const confirmMessage =
    confirmAction === "publish"
      ? t("messages.confirmPublish")
      : t("messages.confirmDelete");

  const confirmLabel =
    confirmAction === "publish"
      ? busyAction === "publish"
        ? t("actions.publishing")
        : t("actions.publish")
      : busyAction === "delete"
        ? t("actions.deleting")
        : t("actions.delete");

  const confirmLoading =
    (confirmAction === "publish" && busyAction === "publish") ||
    (confirmAction === "delete" && busyAction === "delete");

  return {
    campaign,
    loading,
    pageError,
    successMessage,
    warningMessage,
    busyAction,
    confirmAction,
    confirmTitle,
    confirmMessage,
    confirmLabel,
    confirmLoading,
    forecastReadiness,

    setConfirmAction,
    closeConfirmModal,
    handleConfirmAction,
    handleRecalculateForecast,
  };
}