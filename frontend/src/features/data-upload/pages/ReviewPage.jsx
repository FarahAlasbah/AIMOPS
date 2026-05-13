// frontend/src/features/data-upload/pages/ReviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import PageHelp from "../../../shared/components/PageHelp";
import { confirmProducts, getUploadDetails } from "../../../api/data";
import { broadcastNotification } from "../../../api/notifications";
import ReviewStep from "../components/ReviewStep";
import { ReviewPageSkeleton } from "../components/Skeletons";

const safeArr = (value) => (Array.isArray(value) ? value : []);

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

const unwrapUploadDetails = (payload) => {
  if (!payload || typeof payload !== "object") return null;

  return (
    payload.upload ||
    payload.batch ||
    payload.data ||
    payload.details ||
    payload
  );
};

const normalizeProduct = (p) => ({
  primary_name: String(
    p?.primary_name ??
      p?.primaryName ??
      p?.product_name ??
      p?.productName ??
      p?.name ??
      "",
  ).trim(),
  normalized_name: String(
    p?.normalized_name ??
      p?.normalizedName ??
      p?.primary_name ??
      p?.product_name ??
      p?.name ??
      "",
  ).trim(),
  category: p?.category == null ? null : String(p.category).trim() || null,
  possible_typos: Array.isArray(p?.possible_typos)
    ? p.possible_typos
    : Array.isArray(p?.possibleTypos)
      ? p.possibleTypos
      : [],
});

const extractProductsFromValue = (value) => {
  const raw = Array.isArray(value?.products)
    ? value.products
    : Array.isArray(value)
      ? value
      : [];

  return raw
    .map(normalizeProduct)
    .filter((p) => p.primary_name && p.normalized_name);
};

const extractProductsFromMappingResult = (confirmResult) => {
  const raw =
    confirmResult?.products?.products ||
    confirmResult?.products ||
    confirmResult?.extracted_products ||
    confirmResult?.extractedProducts ||
    [];

  return extractProductsFromValue(raw);
};

const extractProductsFromDetails = (details) => {
  const raw =
    details?.products ||
    details?.extracted_products ||
    details?.extractedProducts ||
    details?.product_candidates ||
    details?.productCandidates ||
    details?.confirmed_products ||
    details?.confirmedProducts ||
    details?.mapping_result?.products ||
    details?.mappingResult?.products ||
    [];

  return extractProductsFromValue(raw);
};

const extractConfirmedMappingsFromDetails = (details) => {
  const raw =
    details?.confirmed_mappings ||
    details?.confirmedMappings ||
    details?.mappings ||
    details?.column_mappings ||
    details?.columnMappings ||
    details?.mapping?.mappings ||
    details?.mapping?.confirmed_mappings ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((m) => ({
      original_name:
        m?.original_name ??
        m?.originalName ??
        m?.column_name ??
        m?.columnName ??
        m?.name ??
        "",
      role: m?.role ?? m?.mapped_role ?? m?.mappedRole ?? "",
    }))
    .filter((m) => m.original_name && m.role);
};

const isMappingConfirmedStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();

  return [
    "mapped",
    "mapping_confirmed",
    "mappings_confirmed",
    "products_pending",
    "products_ready",
    "review",
    "review_required",
    "processed",
    "done",
    "success",
    "completed",
    "confirmed",
    "imported",
  ].includes(value);
};

const buildConfirmResultFromDetails = (details) => {
  if (!details) return null;

  const mappings = extractConfirmedMappingsFromDetails(details);
  const products = extractProductsFromDetails(details);

  if (
    !isMappingConfirmedStatus(details.status) &&
    mappings.length === 0 &&
    products.length === 0
  ) {
    return null;
  }

  return {
    success: true,
    confirmed_mappings: mappings,
    products,
  };
};

const buildDraftMap = (productsDraft) => {
  const map = new Map();

  safeArr(productsDraft).forEach((p) => {
    const key = String(p?.normalized_name || "").trim();

    if (!key) return;

    const merge_with = Array.from(
      new Set(
        safeArr(p?.merge_with)
          .map((x) => String(x).trim())
          .filter(Boolean),
      ),
    );

    map.set(key, merge_with);
  });

  return map;
};

const initDraftFromProducts = (products) =>
  safeArr(products).map((p) => ({
    normalized_name: p.normalized_name,
    merge_with: [],
  }));

const isProcessedStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();

  return [
    "processed",
    "done",
    "success",
    "completed",
    "confirmed",
    "imported",
  ].includes(value);
};

export default function ReviewPage() {
  const { t } = useTranslation("upload");
  const navigate = useNavigate();
  const location = useLocation();
  const { batchId } = useParams();

  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmMappingsResult, setConfirmMappingsResult] = useState(
    location.state?.confirmMappingsResult || null,
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

        if (isProcessedStatus(details?.status)) {
          setConfirmProductsResult((current) => current || { success: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            extractApiError(
              err,
              t("reviewPage.errorLoadFailed"),
            ),
          );
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
    () => isProcessedStatus(batchStatus) || !!confirmProductsResult?.success,
    [batchStatus, confirmProductsResult],
  );

  useEffect(() => {
    if (products.length === 0) {
      setProductsDraft([]);
      return;
    }

    setProductsDraft((prev) => {
      if (Array.isArray(prev) && prev.length > 0) return prev;
      return initDraftFromProducts(products);
    });
  }, [products]);

  const toggleMerge = (normalized_name, variation) => {
    const key = String(normalized_name || "").trim();
    const value = String(variation || "").trim();

    if (!key || !value) return;

    setProductsDraft((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex((p) => String(p.normalized_name) === key);

      if (idx === -1) {
        return [...list, { normalized_name: key, merge_with: [value] }];
      }

      const current = Array.isArray(list[idx].merge_with)
        ? list[idx].merge_with
        : [];

      const exists = current.includes(value);
      const next = exists
        ? current.filter((x) => x !== value)
        : [...current, value];

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
      setBatchStatus("processed");

      try {
        await broadcastNotification({
          title: t("reviewPage.notifTitle"),
          message: t("reviewPage.notifMessage", {
            count: confirmed_products.length,
            batchId,
          }),
          type: "info",
          target_type: "all",
        });
      } catch {
        // Notification is helpful but should not block product confirmation.
      }
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
            title={t("reviewPage.help.title")}
            items={[
              {
                title: t("reviewPage.help.items.checkProducts.title"),
                description: t("reviewPage.help.items.checkProducts.description"),
              },
              {
                title: t("reviewPage.help.items.mergeDuplicates.title"),
                description: t(
                  "reviewPage.help.items.mergeDuplicates.description",
                ),
              },
              {
                title: t("reviewPage.help.items.watchWarnings.title"),
                description: t("reviewPage.help.items.watchWarnings.description"),
              },
              {
                title: t("reviewPage.help.items.confirmProducts.title"),
                description: t(
                  "reviewPage.help.items.confirmProducts.description",
                ),
              },
            ]}
            note={t("reviewPage.help.note")}
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
                  {t("reviewPage.alreadyProcessedInfo")}
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
                <InfoMessage type="info">
                  {t("reviewPage.noProductNameInfo")}
                </InfoMessage>
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
              onConfirmProducts={
                canConfirmProducts ? handleConfirmProducts : () => {}
              }
              onBack={() => navigate(`/app/data-upload/map/${batchId}`)}
              onFinish={() => navigate("/app/data-upload/uploads")}
            />
          </>
        )}
      </Card>
    </div>
  );
}