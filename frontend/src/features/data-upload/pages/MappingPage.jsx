// frontend/src/features/data-upload/pages/MappingPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, Card, FormActions, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import PageHelp from "../../../shared/components/PageHelp";

import {
  analyzeSalesBatch,
  confirmSalesMappings,
  getUploadDetails,
} from "../../../api/data";
import MappingStep from "../components/MappingStep";
import { AnalyzeProgress } from "../components/Skeletons";

import { buildConfirmMappingsPayload } from "../utils/confirmPayload";
import { normalizeRole } from "../utils/analysisUtils";

const extractApiError = (err, fallback) => {
  const data = err?.response?.data;

  if (!data) return fallback;

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((d) => {
        const loc = Array.isArray(d.loc) ? d.loc.join(".") : "";
        return loc ? `${loc}: ${d.msg || "Invalid input"}` : d.msg;
      })
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

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

const isCompletedUploadStatus = (status) => {
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

const isCompletedAnalyzeError = (err) => {
  const message = extractApiError(err, "");
  const lower = String(message || "").toLowerCase();

  return (
    lower.includes("batch already completed") ||
    lower.includes("cannot re-analyze")
  );
};

const isBackendFileTypeError = (err) => {
  const message = extractApiError(err, "");
  const lower = String(message || "").toLowerCase();

  return (
    lower.includes("failed to detect file type") ||
    lower.includes("utf-8") ||
    lower.includes("codec can't decode")
  );
};

const getFriendlyMappingError = (err, fallback, t) => {
  if (isBackendFileTypeError(err)) {
    return t("mappingPage.friendlyFileTypeError", { defaultValue: fallback });
  }

  if (isCompletedAnalyzeError(err)) {
    return t("mappingPage.friendlyCompletedError", { defaultValue: fallback });
  }

  return extractApiError(err, fallback);
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
      role: normalizeRole(m?.role ?? m?.mapped_role ?? m?.mappedRole),
    }))
    .filter((m) => m.original_name && m.role && m.role !== "skip");
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

  if (Array.isArray(raw)) return raw;

  if (Array.isArray(raw?.products)) return raw.products;

  return [];
};

const buildConfirmResultFromDetails = (details) => {
  if (!details) return null;

  const confirmedMappings = extractConfirmedMappingsFromDetails(details);
  const products = extractProductsFromDetails(details);
  const statusConfirmed = isMappingConfirmedStatus(details.status);

  if (!statusConfirmed && confirmedMappings.length === 0 && products.length === 0) {
    return null;
  }

  return {
    success: true,
    confirmed_mappings: confirmedMappings,
    products,
  };
};

const normalizeAnalysisResponse = (raw) => {
  if (!raw) return null;

  const rawColumns = Array.isArray(raw.columns) ? raw.columns : [];

  const columns = rawColumns.map((c) => {
    const role = normalizeRole(c.suggested_role ?? c.role ?? "skip");
    const confidenceLevel = String(c.confidence_level ?? "").toLowerCase();
    const confidence = typeof c.confidence === "number" ? c.confidence : 0;

    const verification_needed =
      c.verification_needed != null
        ? !!c.verification_needed
        : confidenceLevel === "medium";

    const auto_include =
      c.auto_include != null
        ? !!c.auto_include
        : role !== "skip" &&
          (confidenceLevel === "high" || confidenceLevel === "medium");

    const classification = c.classification ?? "optional";
    const can_skip = classification !== "required";

    return {
      ...c,
      role,
      suggested_role: c.suggested_role ?? role,
      confidence,
      confidence_level: c.confidence_level ?? "low",
      verification_needed,
      auto_include,
      can_skip,
      non_null_values: c.non_null_values ?? c.total_values ?? null,
      total_values: c.total_values ?? null,
      completeness: c.completeness ?? null,
      benefit: c.benefit ?? c.why ?? c.reason ?? null,
      why: c.why ?? null,
      reason: c.reason ?? null,
      samples: Array.isArray(c.samples) ? c.samples : [],
      user_prompt: c.display_hint ?? c.user_prompt ?? null,
    };
  });

  const high_confidence = columns.filter(
    (c) =>
      String(c.confidence_level ?? "").toLowerCase() === "high" &&
      !c.verification_needed &&
      normalizeRole(c.role) !== "skip",
  );

  const needs_verification = columns.filter((c) => c.verification_needed);

  const needs_mapping = columns.filter(
    (c) =>
      !c.verification_needed &&
      String(c.confidence_level ?? "").toLowerCase() === "low" &&
      normalizeRole(c.role) === "skip",
  );

  const suggested_skip = columns.filter(
    (c) =>
      !c.verification_needed &&
      normalizeRole(c.role) === "skip" &&
      String(c.confidence_level ?? "").toLowerCase() !== "low",
  );

  const rawRequiredMissing = Array.isArray(raw.required_missing)
    ? raw.required_missing
    : [];

  const required_missing = rawRequiredMissing
    .map((r) => ({
      role: r.role ?? r.required_role ?? "",
      name: r.name ?? r.label ?? r.role ?? "",
      user_prompt: r.user_prompt ?? r.display_hint ?? null,
    }))
    .filter((r) => r.role);

  return {
    ...raw,
    columns,
    classified: {
      high_confidence,
      needs_verification,
      needs_mapping,
      required_missing,
      suggested_skip,
    },
  };
};

const extractConfirmedMappingsList = (confirmResult) => {
  const raw =
    confirmResult?.confirmed_mappings ||
    confirmResult?.mappings ||
    confirmResult?.confirmedMappings ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((m) => ({
      original_name: m?.original_name ?? m?.originalName ?? m?.name ?? "",
      role: normalizeRole(m?.role),
    }))
    .filter((m) => m.original_name && m.role);
};

const buildBaseColumnMapFromAnalysis = (analysis) => {
  const initial = {};

  (analysis?.columns || []).forEach((c) => {
    const role = normalizeRole(c.role);

    initial[c.index] = {
      role,
      include: role !== "skip" && !!c.auto_include,
      verified: !c.verification_needed,
    };
  });

  return initial;
};

const buildRequiredMissingInit = (analysis) => {
  const rm = {};

  (analysis?.classified?.required_missing || []).forEach((r) => {
    rm[r.role] = "";
  });

  return rm;
};

const buildColumnMapFromConfirmed = (analysis, confirmResult, baseMap) => {
  const confirmedList = extractConfirmedMappingsList(confirmResult);

  if (confirmedList.length === 0) {
    const locked = {};

    Object.entries(baseMap || {}).forEach(([index, state]) => {
      locked[index] = {
        ...state,
        verified: true,
      };
    });

    return locked;
  }

  const byName = new Map(
    confirmedList.map((m) => [String(m.original_name), normalizeRole(m.role)]),
  );

  const next = {};

  (analysis?.columns || []).forEach((c) => {
    const mappedRole = byName.get(String(c.name));
    const role = normalizeRole(mappedRole || "skip");

    next[c.index] = {
      role,
      include: role !== "skip",
      verified: true,
    };
  });

  return next;
};

const buildRequiredMissingFromColumnMap = (analysis, columnMap) => {
  const rm = buildRequiredMissingInit(analysis);
  const requiredMissing = analysis?.classified?.required_missing || [];

  requiredMissing.forEach((r) => {
    const requiredRole = normalizeRole(r.role);

    const found = Object.entries(columnMap || {}).find(
      ([, st]) => normalizeRole(st?.role) === requiredRole,
    );

    if (found) {
      rm[r.role] = String(found[0]);
    }
  });

  return rm;
};

const useFakeProgress = (active) => {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!active) {
      setPct(0);
      return;
    }

    let mounted = true;

    setPct(0);

    const timer = window.setInterval(() => {
      if (!mounted) return;

      setPct((prev) => {
        const cap = 95;
        if (prev >= cap) return cap;

        const remaining = cap - prev;
        const step = Math.max(1, Math.round(remaining * 0.12));

        return Math.min(cap, prev + step);
      });
    }, 220);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [active]);

  const finish = useCallback(() => {
    setPct(100);
  }, []);

  return { pct, finish };
};

export default function MappingPage() {
  const { t } = useTranslation("upload");
  const navigate = useNavigate();
  const { batchId } = useParams();

  const [error, setError] = useState("");

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const [columnMap, setColumnMap] = useState({});
  const [requiredMissingMap, setRequiredMissingMap] = useState({});

  const [confirming, setConfirming] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
  const [completedNotice, setCompletedNotice] = useState(false);

  const { pct: analyzePct, finish: finishAnalyzePct } =
    useFakeProgress(analysisLoading);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!batchId) return;

      setError("");
      setCompletedNotice(false);
      setAnalysisLoading(true);

      try {
        const [analysisResult, detailsResult] = await Promise.allSettled([
          analyzeSalesBatch(batchId),
          getUploadDetails(batchId),
        ]);

        if (cancelled) return;

        const details =
          detailsResult.status === "fulfilled"
            ? unwrapUploadDetails(detailsResult.value)
            : null;

        const completedByStatus = isCompletedUploadStatus(details?.status);
        const completedByAnalyzeError =
          analysisResult.status === "rejected" &&
          isCompletedAnalyzeError(analysisResult.reason);

        if (completedByStatus || completedByAnalyzeError) {
          setAnalysis(null);
          setColumnMap({});
          setRequiredMissingMap({});
          setAlreadyConfirmed(true);
          setCompletedNotice(true);
          return;
        }

        if (analysisResult.status === "rejected") {
          throw analysisResult.reason;
        }

        const normalizedAnalysis = normalizeAnalysisResponse(analysisResult.value);
        const confirmedFromDetails = buildConfirmResultFromDetails(details);

        setAnalysis(normalizedAnalysis);

        const base = buildBaseColumnMapFromAnalysis(normalizedAnalysis);

        if (confirmedFromDetails?.success) {
          const fromConfirmed = buildColumnMapFromConfirmed(
            normalizedAnalysis,
            confirmedFromDetails,
            base,
          );

          setColumnMap(fromConfirmed);
          setRequiredMissingMap(
            buildRequiredMissingFromColumnMap(normalizedAnalysis, fromConfirmed),
          );
          setAlreadyConfirmed(true);
          return;
        }

        setColumnMap(base);
        setRequiredMissingMap(buildRequiredMissingInit(normalizedAnalysis));
        setAlreadyConfirmed(false);
      } catch (err) {
        if (!cancelled) {
          const fallback = t("mappingPage.errorAnalyzeFailed");
          setError(getFriendlyMappingError(err, fallback, t));
          setAnalysis(null);
          setCompletedNotice(false);
        }
      } finally {
        if (!cancelled) {
          finishAnalyzePct();
          window.setTimeout(() => setAnalysisLoading(false), 220);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [batchId, finishAnalyzePct, t]);

  const allColumnsOptions = useMemo(() => {
    const cols = analysis?.columns || [];
    return cols.map((c) => ({ value: String(c.index), label: c.name }));
  }, [analysis]);

  const needsVerificationSet = useMemo(() => {
    const set = new Set();

    (analysis?.classified?.needs_verification || []).forEach((c) =>
      set.add(String(c.index)),
    );

    return set;
  }, [analysis]);

  const setRole = (colIndex, roleRaw) => {
    if (alreadyConfirmed) return;

    const nextRole = normalizeRole(roleRaw);

    setColumnMap((prev) => {
      const prevEntry = prev[colIndex] || {};
      const prevRole = normalizeRole(prevEntry.role);

      const roleChanged = prevRole !== nextRole;
      const needsReconfirm =
        roleChanged && needsVerificationSet.has(String(colIndex));

      return {
        ...prev,
        [colIndex]: {
          ...prevEntry,
          role: nextRole,
          include: nextRole !== "skip",
          verified: needsReconfirm ? false : !!prevEntry.verified,
        },
      };
    });
  };

  const confirmVerified = (colIndex) => {
    if (alreadyConfirmed) return;

    setColumnMap((prev) => ({
      ...prev,
      [colIndex]: {
        ...(prev[colIndex] || {}),
        verified: true,
      },
    }));
  };

  const toggleInclude = (colIndex) => {
    if (alreadyConfirmed) return;

    setColumnMap((prev) => ({
      ...prev,
      [colIndex]: {
        ...(prev[colIndex] || {}),
        include: !prev[colIndex]?.include,
      },
    }));
  };

  const setRequiredMissing = (requiredRole, colIndexStr) => {
    if (alreadyConfirmed) return;

    setRequiredMissingMap((prev) => ({
      ...prev,
      [requiredRole]: colIndexStr,
    }));

    const colIndex = Number(colIndexStr);

    if (!Number.isNaN(colIndex)) {
      const isNeedsVerification = needsVerificationSet.has(String(colIndex));

      setColumnMap((prev) => ({
        ...prev,
        [colIndex]: {
          ...(prev[colIndex] || {}),
          role: normalizeRole(requiredRole),
          include: true,
          verified: !isNeedsVerification,
        },
      }));
    }
  };

  const canConfirm = useMemo(() => {
    if (!analysis) return false;
    if (alreadyConfirmed) return true;

    const needsVerification = analysis?.classified?.needs_verification || [];

    for (const c of needsVerification) {
      if (!columnMap?.[c.index]?.verified) return false;
    }

    const needsMapping = analysis?.classified?.needs_mapping || [];

    for (const c of needsMapping) {
      const role = normalizeRole(columnMap?.[c.index]?.role);
      if (!role || role === "skip") return false;
    }

    const requiredMissing = analysis?.classified?.required_missing || [];

    for (const r of requiredMissing) {
      if (!requiredMissingMap?.[r.role]) return false;
    }

    return true;
  }, [analysis, columnMap, requiredMissingMap, alreadyConfirmed]);

  const handleConfirm = async () => {
    setError("");

    if (!analysis || !batchId) return;

    if (alreadyConfirmed) {
      navigate(`/app/data-upload/review/${batchId}`);
      return;
    }

    const payload = buildConfirmMappingsPayload({ analysis, columnMap });

    try {
      setConfirming(true);

      const res = await confirmSalesMappings(batchId, payload);

      setAlreadyConfirmed(!!res?.success);

      navigate(`/app/data-upload/review/${batchId}`, {
        state: {
          confirmMappingsResult: res,
        },
      });
    } catch (err) {
      const fallback = t("mappingPage.errorConfirmFailed");
      setError(getFriendlyMappingError(err, fallback, t));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="data-upload-page">
      <PageHeader
        actions={
          <PageHelp
            title={t("mappingPage.help.title")}
            items={[
              {
                title: t("mappingPage.help.items.reviewRoles.title"),
                description: t("mappingPage.help.items.reviewRoles.description"),
              },
              {
                title: t("mappingPage.help.items.confirmUncertain.title"),
                description: t(
                  "mappingPage.help.items.confirmUncertain.description",
                ),
              },
              {
                title: t("mappingPage.help.items.fixRequired.title"),
                description: t("mappingPage.help.items.fixRequired.description"),
              },
              {
                title: t("mappingPage.help.items.skipIrrelevant.title"),
                description: t(
                  "mappingPage.help.items.skipIrrelevant.description",
                ),
              },
            ]}
            note={t("mappingPage.help.note")}
          />
        }
      />

      <Card>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        )}

        {alreadyConfirmed && !completedNotice && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="success">
              {t("mappingPage.alreadyConfirmedInfo")}
            </InfoMessage>
          </div>
        )}

        {completedNotice ? (
          <>
            <InfoMessage type="success">
              <strong>{t("mappingPage.completedNoticeTitle")}</strong>
              <br />
              {t("mappingPage.completedNoticeMessage")}
            </InfoMessage>

            <FormActions>
              <Button
                variant="secondary"
                onClick={() => navigate("/app/data-upload/uploads")}
              >
                {t("mappingPage.backToUploads")}
              </Button>

              <Button variant="primary" onClick={() => navigate("/app/products")}>
                {t("mappingPage.viewProducts")}
              </Button>
            </FormActions>
          </>
        ) : analysisLoading ? (
          <AnalyzeProgress percent={analyzePct} />
        ) : (
          <MappingStep
            analysisLoading={false}
            analysis={analysis}
            allColumnsOptions={allColumnsOptions}
            columnMap={columnMap}
            requiredMissingMap={requiredMissingMap}
            alreadyConfirmed={alreadyConfirmed}
            onBack={() => navigate("/app/data-upload/uploads")}
            onSetRole={setRole}
            onConfirmVerified={confirmVerified}
            onToggleInclude={toggleInclude}
            onPickRequiredMissing={setRequiredMissing}
            canConfirm={canConfirm}
            onConfirm={handleConfirm}
            confirming={confirming}
          />
        )}
      </Card>
    </div>
  );
}