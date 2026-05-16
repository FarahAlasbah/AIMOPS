import { useEffect, useMemo, useState } from "react";

import { confirmProducts, getUploadDetails } from "../../../api/data";
import { broadcastNotification } from "../../../api/notifications";

import { extractApiError, unwrapUploadDetails } from "../utils/dataUploadErrorUtils";
import { isCompletedUploadStatus } from "../utils/dataUploadStatusUtils";

import {
  buildConfirmResultFromDetails,
  buildDraftMap,
  extractProductsFromDetails,
  extractProductsFromMappingResult,
  initDraftFromProducts,
  safeArr,
} from "../utils/reviewPageUtils";

export function useReviewPage({ batchId, locationState, t }) {
  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirmMappingsResult, setConfirmMappingsResult] = useState(
    locationState?.confirmMappingsResult || null,
  );

  const [uploadDetails, setUploadDetails] = useState(null);
  const [productsDraft, setProductsDraft] = useState([]);
  const [confirmingProducts, setConfirmingProducts] = useState(false);
  const [confirmProductsResult, setConfirmProductsResult] = useState(null);
  const [batchStatus, setBatchStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!batchId) return;

      setLocalLoading(true);
      setError("");

      try {
        const payload = await getUploadDetails(batchId);

        if (cancelled) return;

        const details = unwrapUploadDetails(payload);
        const fromDetails = buildConfirmResultFromDetails(details);

        setUploadDetails(details);
        setBatchStatus(details?.status || "");

        setConfirmMappingsResult((current) => {
          if (current?.success) return current;
          return fromDetails;
        });

        if (isCompletedUploadStatus(details?.status)) {
          setConfirmProductsResult((current) => current || { success: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractApiError(err, t("reviewPage.errorLoadFailed")));
        }
      } finally {
        if (!cancelled) {
          setLocalLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [batchId, t]);

  const products = useMemo(() => {
    const fromMapping = extractProductsFromMappingResult(confirmMappingsResult);

    if (fromMapping.length > 0) return fromMapping;

    return extractProductsFromDetails(uploadDetails);
  }, [confirmMappingsResult, uploadDetails]);

  const alreadyProcessed = useMemo(
    () => isCompletedUploadStatus(batchStatus) || !!confirmProductsResult?.success,
    [batchStatus, confirmProductsResult],
  );

  useEffect(() => {
    if (products.length === 0) {
      setProductsDraft([]);
      return;
    }

    setProductsDraft((previous) => {
      if (Array.isArray(previous) && previous.length > 0) return previous;
      return initDraftFromProducts(products);
    });
  }, [products]);

  const toggleMerge = (normalizedName, variation) => {
    const key = String(normalizedName || "").trim();
    const value = String(variation || "").trim();

    if (!key || !value) return;

    setProductsDraft((previous) => {
      const list = Array.isArray(previous) ? [...previous] : [];
      const index = list.findIndex((product) => {
        return String(product.normalized_name) === key;
      });

      if (index === -1) {
        return [...list, { normalized_name: key, merge_with: [value] }];
      }

      const current = Array.isArray(list[index].merge_with)
        ? list[index].merge_with
        : [];

      const exists = current.includes(value);

      const next = exists
        ? current.filter((item) => item !== value)
        : [...current, value];

      list[index] = {
        ...list[index],
        merge_with: next,
      };

      return list;
    });
  };

  const canConfirmProducts = useMemo(() => {
    if (products.length === 0) return false;
    if (alreadyProcessed) return false;

    return true;
  }, [products, alreadyProcessed]);

  const handleConfirmProducts = async () => {
    setError("");

    if (!batchId || !canConfirmProducts) return;

    try {
      setConfirmingProducts(true);

      const mergesByNormalizedName = buildDraftMap(productsDraft);

      const confirmedProducts = products.map((product) => ({
        primary_name: product.primary_name,
        normalized_name: product.normalized_name,
        category: product.category ?? null,
        merge_with: mergesByNormalizedName.get(product.normalized_name) || [],
      }));

      const response = await confirmProducts(batchId, {
        confirmed_products: confirmedProducts,
      });

      setConfirmProductsResult(response);
      setBatchStatus("processed");

      try {
        await broadcastNotification({
          title: t("reviewPage.notifTitle"),
          message: t("reviewPage.notifMessage", {
            count: confirmedProducts.length,
            batchId,
          }),
          type: "info",
          target_type: "all",
        });
      } catch {
        // Notification should not block product confirmation.
      }
    } catch (err) {
      setError(extractApiError(err, t("reviewPage.errorConfirmFailed")));
    } finally {
      setConfirmingProducts(false);
    }
  };

  return {
    localLoading,
    error,
    confirmMappingsResult,
    products,
    productsDraft,
    confirmProductsResult,
    confirmingProducts,
    alreadyProcessed,
    canConfirmProducts,

    toggleMerge,
    handleConfirmProducts,
  };
}