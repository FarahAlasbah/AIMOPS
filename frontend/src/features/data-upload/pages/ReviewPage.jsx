// frontend/src/features/data-upload/pages/ReviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import PageHelp from "../../../shared/components/PageHelp";
import { confirmProducts, getAllUploads } from "../../../api/data";
import { broadcastNotification } from "../../../api/notifications";
import ReviewStep from "../components/ReviewStep";
import { ReviewPageSkeleton } from "../components/Skeletons";

const LS_CONFIRMED_MAPPINGS_KEY = (id) => `sales_confirmed_mappings_v1_${id}`;
const LS_PRODUCTS_DRAFT_KEY = (id) => `sales_products_draft_v1_${id}`;
const LS_CONFIRMED_PRODUCTS_KEY = (id) => `sales_confirmed_products_v1_${id}`;

const extractApiError = (err, fallback) => {
  const data = err?.response?.data;
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((d) => {
        const loc = Array.isArray(d?.loc) ? d.loc.join(".") : "";
        const msg = d?.msg || "Invalid input";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join(" | ");
  }
  if (typeof data?.detail === "string") return data.detail;
  if (data?.detail && typeof data.detail === "object") {
    if (typeof data.detail.message === "string") return data.detail.message;
    try {
      return JSON.stringify(data.detail);
    } catch {
      return fallback;
    }
  }
  if (typeof data?.message === "string") return data.message;
  if (typeof err?.message === "string") return err.message;
  return fallback;
};

const extractProductsFromMappingResult = (confirmResult) => {
  const list = confirmResult?.products?.products || confirmResult?.products || [];
  if (!Array.isArray(list)) return [];

  return list
    .map((p) => ({
      primary_name: String(p?.primary_name ?? p?.name ?? "").trim(),
      normalized_name: String(p?.normalized_name ?? "").trim(),
      category: p?.category == null ? null : String(p.category).trim() || null,
      possible_typos: Array.isArray(p?.possible_typos) ? p.possible_typos : [],
    }))
    .filter((p) => p.primary_name && p.normalized_name);
};

const buildDraftMap = (productsDraft) => {
  const map = new Map();
  (productsDraft || []).forEach((p) => {
    const key = String(p?.normalized_name || "").trim();
    if (!key) return;
    const merge_with = Array.from(
      new Set(
        (Array.isArray(p?.merge_with) ? p.merge_with : [])
          .map((x) => String(x).trim())
          .filter(Boolean)
      )
    );
    map.set(key, merge_with);
  });
  return map;
};

const initDraftFromProducts = (products) =>
  products.map((p) => ({ normalized_name: p.normalized_name, merge_with: [] }));

const isProcessedStatus = (status) => {
  const v = String(status || "").trim().toLowerCase();
  return ["processed", "done", "success", "completed", "confirmed", "imported"].includes(v);
};

export default function ReviewPage() {
  const { t } = useTranslation("upload");
  const navigate = useNavigate();
  const { batchId } = useParams();

  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmMappingsResult, setConfirmMappingsResult] = useState(null);
  const [productsDraft, setProductsDraft] = useState([]);
  const [confirmingProducts, setConfirmingProducts] = useState(false);
  const [confirmProductsResult, setConfirmProductsResult] = useState(null);
  const [batchStatus, setBatchStatus] = useState("");

  useEffect(() => {
    if (!batchId) return;
    setLocalLoading(true);

    try {
      const raw = localStorage.getItem(LS_CONFIRMED_MAPPINGS_KEY(batchId));
      setConfirmMappingsResult(raw ? JSON.parse(raw) : null);
    } catch {
      setConfirmMappingsResult(null);
    }

    try {
      const raw = localStorage.getItem(LS_CONFIRMED_PRODUCTS_KEY(batchId));
      setConfirmProductsResult(raw ? JSON.parse(raw) : null);
    } catch {
      setConfirmProductsResult(null);
    }

    try {
      const raw = localStorage.getItem(LS_PRODUCTS_DRAFT_KEY(batchId));
      const parsed = raw ? JSON.parse(raw) : null;
      const cleaned = Array.isArray(parsed)
        ? parsed
            .map((p) => ({
              normalized_name: String(p?.normalized_name ?? "").trim(),
              merge_with: Array.isArray(p?.merge_with) ? p.merge_with : [],
            }))
            .filter((p) => p.normalized_name)
        : [];
      setProductsDraft(cleaned);
    } catch {
      setProductsDraft([]);
    }

    setLocalLoading(false);
  }, [batchId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!batchId) return;

      try {
        const uploads = await getAllUploads({ limit: 100, maxPages: 50 });
        if (cancelled) return;

        const found = Array.isArray(uploads)
          ? uploads.find((u) => String(u?.batch_id ?? u?.batchId) === String(batchId))
          : null;

        setBatchStatus(found?.status || "");
      } catch {
        if (!cancelled) setBatchStatus("");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  const products = useMemo(
    () => extractProductsFromMappingResult(confirmMappingsResult),
    [confirmMappingsResult]
  );

  const alreadyProcessed = useMemo(
    () => isProcessedStatus(batchStatus) || !!confirmProductsResult?.success,
    [batchStatus, confirmProductsResult]
  );

  useEffect(() => {
    if (!batchId) return;
    if (products.length === 0) return;
    if (confirmProductsResult?.success) return;

    setProductsDraft((prev) => {
      if (Array.isArray(prev) && prev.length > 0) return prev;
      const next = initDraftFromProducts(products);
      try {
        localStorage.setItem(LS_PRODUCTS_DRAFT_KEY(batchId), JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [products, batchId, confirmProductsResult?.success]);

  useEffect(() => {
    if (!batchId) return;
    try {
      localStorage.setItem(LS_PRODUCTS_DRAFT_KEY(batchId), JSON.stringify(productsDraft || []));
    } catch {}
  }, [productsDraft, batchId]);

  const toggleMerge = (normalized_name, variation) => {
    const key = String(normalized_name || "").trim();
    const v = String(variation || "").trim();
    if (!key || !v) return;

    setProductsDraft((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex((p) => String(p.normalized_name) === key);

      if (idx === -1) return [...list, { normalized_name: key, merge_with: [v] }];

      const cur = Array.isArray(list[idx].merge_with) ? list[idx].merge_with : [];
      const exists = cur.includes(v);
      const next = exists ? cur.filter((x) => x !== v) : [...cur, v];
      list[idx] = { ...list[idx], merge_with: next };
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

      const mergesByNorm = buildDraftMap(productsDraft);
      const confirmed_products = products.map((p) => ({
        primary_name: p.primary_name,
        normalized_name: p.normalized_name,
        category: p.category ?? null,
        merge_with: mergesByNorm.get(p.normalized_name) || [],
      }));

      const res = await confirmProducts(batchId, { confirmed_products });

      setConfirmProductsResult(res);
      try {
        localStorage.setItem(LS_CONFIRMED_PRODUCTS_KEY(batchId), JSON.stringify(res));
      } catch {}

      try {
        await broadcastNotification({
          title: t("reviewPage.notifTitle", { defaultValue: "New Products Confirmed" }),
          message: t("reviewPage.notifMessage", {
            count: confirmed_products.length,
            batchId,
            defaultValue: `${confirmed_products.length} new product(s) from batch #${batchId} have been confirmed and are now available.`,
          }),
          type: "info",
          target_type: "all",
        });
      } catch {}
    } catch (err) {
      setError(extractApiError(err, t("reviewPage.errorConfirmFailed")));
    } finally {
      setConfirmingProducts(false);
    }
  };

  return (
    <div className="data-upload-page">
    <PageHeader
  
  actions={
    <PageHelp
      title="How to use Product Review"
      items={[
        {
          title: "1. Check extracted products",
          description:
            "Review the products AIMOPS found from the uploaded sales file. Make sure the product names and categories look correct.",
        },
        {
          title: "2. Merge duplicates",
          description:
            "Use Manage merges when the same product appears with different spellings or names. This keeps reports and forecasts cleaner.",
        },
        {
          title: "3. Watch typo warnings",
          description:
            "Warning chips show possible spelling issues or product names that may need merging.",
        },
        {
          title: "4. Confirm products",
          description:
            "After confirming, the products become available for the rest of the system, including reports and forecasting.",
        },
      ]}
      note="Once products are confirmed or the batch is already processed, editing is locked."
    />
  }
/>

      <Card>
        {localLoading ? (
          <ReviewPageSkeleton />
        ) : (
          <>
            {error && (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="error">{error}</InfoMessage>
              </div>
            )}

            {alreadyProcessed && !confirmProductsResult?.success && (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="info">
                  {t("reviewPage.alreadyProcessedInfo", {
                    defaultValue:
                      "This batch has already been processed. You can finish and return to uploads.",
                  })}
                </InfoMessage>
              </div>
            )}

            {!confirmMappingsResult?.success && (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="warn">{t("reviewPage.noMappingsWarn")}</InfoMessage>
              </div>
            )}

            {confirmMappingsResult?.success && products.length === 0 && (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="info">{t("reviewPage.noProductNameInfo")}</InfoMessage>
              </div>
            )}

            <ReviewStep
              batchId={batchId}
              confirmMappingsResult={confirmMappingsResult}
              products={products}
              productsDraft={productsDraft}
              confirmProductsResult={confirmProductsResult}
              confirmingProducts={confirmingProducts}
              alreadyProcessed={alreadyProcessed}
              onToggleMerge={toggleMerge}
              onConfirmProducts={canConfirmProducts ? handleConfirmProducts : () => {}}
              onBack={() => navigate(`/app/data-upload/map/${batchId}`)}
              onFinish={() => navigate("/app/data-upload/uploads")}
            />
          </>
        )}
      </Card>
    </div>
  );
}