import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  deleteForecastExplanation,
  generateForecast,
  getForecastExplanation,
  getForecastStatus,
  getProductForecast,
} from "../../../api/forecasts";

import { useLatestValueRef } from "./useLatestValueRef";
import {
  clearExplanationCache,
  extractApiMessage,
  getApiStatus,
  MAX_FORECAST_DAYS,
  normalizeExplanationResponse,
  normalizeStatus,
  POLL_MS,
  readExplanationCache,
  writeExplanationCache,
} from "../utils/forecastDetailsUtils";

export function useForecastDetailsData(productId) {
  const { t } = useTranslation("forecasting");
  const tRef = useLatestValueRef(t);

  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState("");

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [detailsErr, setDetailsErr] = useState("");
  const [detailsWarn, setDetailsWarn] = useState("");

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
      setStatusErr(e?.message || tRef.current("messages.statusFailed"));
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, [productId, tRef]);

  const loadForecast = useCallback(async () => {
    setDetailsLoading(true);
    setDetailsErr("");
    setDetailsWarn("");

    try {
      const res = await getProductForecast(productId, {
        days: MAX_FORECAST_DAYS,
      });

      setForecast(res);
      return res;
    } catch (e) {
      setForecast(null);

      if (getApiStatus(e) === 404) {
        setDetailsWarn(tRef.current("messages.forecastNotFound"));
        return null;
      }

      setDetailsErr(
        extractApiMessage(e, tRef.current("messages.detailsFailed")),
      );
      return null;
    } finally {
      setDetailsLoading(false);
    }
  }, [productId, tRef]);

  const loadExplanation = useCallback(async () => {
    setExplanationLoading(true);
    setExplanationErr("");

    try {
      const res = await getForecastExplanation(productId);
      const normalized = normalizeExplanationResponse(res);

      setExplanationData(normalized);
      writeExplanationCache(productId, normalized);

      return normalized;
    } catch (e) {
      setExplanationData(null);

      const message =
        e?.response?.data?.detail ||
        e?.message ||
        tRef.current("messages.explanationFailed");

      setExplanationErr(String(message));
      return null;
    } finally {
      setExplanationLoading(false);
    }
  }, [productId, tRef]);

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
      const normalized = normalizeExplanationResponse(res);

      setExplanationData(normalized);
      writeExplanationCache(productId, normalized);
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.message ||
        tRef.current("messages.explanationFailed");

      setExplanationErr(String(message));
      setExplanationData(null);
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleGenerate = async (retrain = false) => {
    setActionBusy(true);
    setInfo(null);
    setStatusErr("");
    setDetailsErr("");
    setDetailsWarn("");

    try {
      const res = await generateForecast({
        productId: Number(productId),
        retrain,
      });

      setInfo({
        type: "success",
        text:
          res?.message ||
          tRef.current("messages.generateAccepted", {
            name:
              status?.product_name ||
              tRef.current("details.productFallback", { id: productId }),
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
          tRef.current("messages.generateFailed", {
            name:
              status?.product_name ||
              tRef.current("details.productFallback", { id: productId }),
          }),
      );
    } finally {
      setActionBusy(false);
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
      return;
    }

    setExplanationData(null);
    setExplanationErr("");
    setExplanationLoading(false);
    setHasFetchedExplanation(false);
  }, [productId]);

  useEffect(() => {
    if (!status?.status) return;

    if (status.status === "ready") {
      loadForecast();

      const cached = readExplanationCache(productId);
      if (cached?.explanation) {
        setExplanationData(cached);
        setExplanationErr("");
        setExplanationLoading(false);
        setHasFetchedExplanation(true);
      }

      return;
    }

    setForecast(null);
    setDetailsErr("");
    setDetailsWarn("");

    if (status.status === "training" || status.status === "failed") {
      setExplanationData(null);
      setExplanationErr("");
      setExplanationLoading(false);
      setHasFetchedExplanation(false);
    }
  }, [status?.status, loadForecast, productId]);

  useEffect(() => {
    if (status?.status !== "training") return undefined;

    const id = window.setInterval(loadStatus, POLL_MS);
    return () => window.clearInterval(id);
  }, [status?.status, loadStatus]);

  return {
    statusLoading,
    status,
    statusErr,

    detailsLoading,
    forecast,
    detailsErr,
    detailsWarn,

    actionBusy,
    info,

    explanationData,
    explanationLoading,
    explanationErr,
    hasFetchedExplanation,

    handleGenerate,
    handleExplainWithAi,
    handleReExplainWithAi,
  };
}