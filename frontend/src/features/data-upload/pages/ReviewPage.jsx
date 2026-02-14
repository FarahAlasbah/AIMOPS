// frontend/src/features/data-upload/pages/ReviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { extractProducts, confirmProducts } from "../../../api/data";
import ReviewStep from "../components/ReviewStep";
import { ReviewPageSkeleton } from "../components/Skeletons";

const LS_CONFIRMED_MAPPINGS_KEY = (batchId) => `sales_confirmed_mappings_v1_${batchId}`;
const LS_EXTRACTED_PRODUCTS_KEY = (batchId) => `sales_extracted_products_v1_${batchId}`;
const LS_PRODUCTS_DRAFT_KEY = (batchId) => `sales_products_draft_v1_${batchId}`;
const LS_CONFIRMED_PRODUCTS_KEY = (batchId) => `sales_confirmed_products_v1_${batchId}`;

const extractApiError = (err, fallback = "Something went wrong.") => {
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

const normalizeConfirmedMappings = (confirmResult) => {
  const raw =
    confirmResult?.confirmed_mappings ||
    confirmResult?.mappings ||
    confirmResult?.confirmedMappings ||
    [];

  if (!Array.isArray(raw)) return [];

  const cleaned = raw
    .map((m) => ({
      original_name: m?.original_name ?? m?.originalName ?? m?.name ?? "",
      role: m?.role ?? "",
    }))
    .filter((m) => m.original_name && m.role);

  const allowed = new Set([
    "date",
    "product_name",
    "quantity",
    "unit_price",
    "total_amount",
    "category",
  ]);

  return cleaned.filter((m) => allowed.has(String(m.role)));
};

// Draft is ONLY merges, nothing else
const initDraftFromExtract = (extractResult) => {
  const list = Array.isArray(extractResult?.products) ? extractResult.products : [];
  return list
    .map((p) => ({
      normalized_name: String(p?.normalized_name ?? "").trim(),
      merge_with: [],
    }))
    .filter((p) => p.normalized_name);
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
          .filter(Boolean),
      ),
    );

    map.set(key, merge_with);
  });
  return map;
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const { batchId } = useParams();

  const [localLoading, setLocalLoading] = useState(true);

  const [error, setError] = useState("");

  const [confirmResult, setConfirmResult] = useState(null);

  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);

  const [productsDraft, setProductsDraft] = useState([]);

  const [confirmingProducts, setConfirmingProducts] = useState(false);
  const [confirmProductsResult, setConfirmProductsResult] = useState(null);

  // Load local state (and avoid flicker)
  useEffect(() => {
    if (!batchId) return;

    setLocalLoading(true);

    try {
      const raw = localStorage.getItem(LS_CONFIRMED_MAPPINGS_KEY(batchId));
      setConfirmResult(raw ? JSON.parse(raw) : null);
    } catch {
      setConfirmResult(null);
    }

    try {
      const raw = localStorage.getItem(LS_EXTRACTED_PRODUCTS_KEY(batchId));
      setExtractResult(raw ? JSON.parse(raw) : null);
    } catch {
      setExtractResult(null);
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

      // accept old drafts too, but keep only normalized_name + merge_with
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

  // If we have extractResult but no draft, init draft
  useEffect(() => {
    if (!batchId) return;
    if (!extractResult?.success) return;

    if (!Array.isArray(productsDraft) || productsDraft.length === 0) {
      const next = initDraftFromExtract(extractResult);
      setProductsDraft(next);
      try {
        localStorage.setItem(LS_PRODUCTS_DRAFT_KEY(batchId), JSON.stringify(next));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractResult, batchId]);

  // Persist draft
  useEffect(() => {
    if (!batchId) return;
    try {
      localStorage.setItem(LS_PRODUCTS_DRAFT_KEY(batchId), JSON.stringify(productsDraft || []));
    } catch {}
  }, [productsDraft, batchId]);

  const confirmedMappings = useMemo(
    () => normalizeConfirmedMappings(confirmResult),
    [confirmResult],
  );

  const canExtract = useMemo(() => {
    if (!confirmResult?.success) return false;
    return confirmedMappings.some((m) => m.role === "product_name");
  }, [confirmResult, confirmedMappings]);

  const handleExtract = async () => {
    setError("");
    if (!batchId) return;

    // block extract twice
    if (extractResult?.success) return;
    if (confirmProductsResult?.success) return;

    if (!canExtract) {
      setError(
        "Extract products needs at least: product_name (and usually date/quantity/unit_price/total_amount).",
      );
      return;
    }

    try {
      setExtracting(true);

      const payload = { mappings: confirmedMappings };
      const res = await extractProducts(batchId, payload);

      setExtractResult(res);
      try {
        localStorage.setItem(LS_EXTRACTED_PRODUCTS_KEY(batchId), JSON.stringify(res));
      } catch {}

      const nextDraft = initDraftFromExtract(res);
      setProductsDraft(nextDraft);
      try {
        localStorage.setItem(LS_PRODUCTS_DRAFT_KEY(batchId), JSON.stringify(nextDraft));
      } catch {}
    } catch (err) {
      setError(extractApiError(err, "Extract products failed."));
    } finally {
      setExtracting(false);
    }
  };

  // Auto-extract once
  useEffect(() => {
    if (!batchId) return;
    if (!confirmResult?.success) return;
    if (confirmProductsResult?.success) return;
    if (extractResult?.success) return;
    if (!canExtract) return;

    handleExtract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, confirmResult?.success]);

  const toggleMerge = (normalized_name, variation) => {
    const key = String(normalized_name || "").trim();
    const v = String(variation || "").trim();
    if (!key || !v) return;

    setProductsDraft((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex((p) => String(p.normalized_name) === key);

      if (idx === -1) {
        // if somehow missing, create it
        return [...list, { normalized_name: key, merge_with: [v] }];
      }

      const cur = Array.isArray(list[idx].merge_with) ? list[idx].merge_with : [];
      const exists = cur.includes(v);
      const next = exists ? cur.filter((x) => x !== v) : [...cur, v];

      list[idx] = { ...list[idx], merge_with: next };
      return list;
    });
  };

  const canConfirmProducts = useMemo(() => {
    if (!extractResult?.success) return false;
    if (confirmProductsResult?.success) return false;

    const products = Array.isArray(extractResult?.products) ? extractResult.products : [];
    if (products.length === 0) return false;

    // must have normalized + primary from extract (read-only)
    for (const p of products) {
      if (!String(p?.normalized_name || "").trim()) return false;
      if (!String(p?.primary_name || "").trim()) return false;
    }
    return true;
  }, [extractResult, confirmProductsResult]);

  const handleConfirmProducts = async () => {
    setError("");
    if (!batchId) return;

    if (!canConfirmProducts) {
      setError("Cannot confirm products yet. Make sure extraction succeeded.");
      return;
    }

    try {
      setConfirmingProducts(true);

      const products = Array.isArray(extractResult?.products) ? extractResult.products : [];
      const mergesByNorm = buildDraftMap(productsDraft);

      // Build from extractResult ONLY (read-only fields), add merges from draft
      const confirmed_products = products.map((p) => {
        const primary_name = String(p.primary_name || "").trim();
        const normalized_name = String(p.normalized_name || "").trim();

        const merge_with = mergesByNorm.get(normalized_name) || [];

        const categoryRaw = p?.category == null ? "" : String(p.category).trim();

        return {
          primary_name,
          normalized_name,
          category: categoryRaw ? categoryRaw : null,
          merge_with,
        };
      });

      const res = await confirmProducts(batchId, { confirmed_products });

      setConfirmProductsResult(res);
      try {
        localStorage.setItem(LS_CONFIRMED_PRODUCTS_KEY(batchId), JSON.stringify(res));
      } catch {}
    } catch (err) {
      setError(extractApiError(err, "Confirm products failed."));
    } finally {
      setConfirmingProducts(false);
    }
  };

  return (
    <div className="data-upload-page">
      <PageHeader
        title="Extract & Confirm Products"
        breadcrumbs={[
          {
            label: "Upload Sales Data",
            link: true,
            onClick: () => navigate("/app/data-upload/uploads"),
          },
          { label: `Batch ${batchId}`, link: false },
        ]}
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

            {!confirmResult?.success && (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="warn">
                  No confirmed mappings found for this batch on this device. Go back and confirm mappings again.
                </InfoMessage>
              </div>
            )}

            {!canExtract && confirmResult?.success && (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="info">
                  Product extraction needs at least: product_name (and usually date/quantity/unit_price/total_amount). Go back and fix the column mappings if needed.
                </InfoMessage>
              </div>
            )}

            <ReviewStep
              batchId={batchId}
              confirmResult={confirmResult}
              confirmedMappings={confirmedMappings}
              extracting={extracting}
              extractResult={extractResult}
              productsDraft={productsDraft}
              confirmProductsResult={confirmProductsResult}
              confirmingProducts={confirmingProducts}
              onExtract={canExtract ? handleExtract : () => {}}
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
