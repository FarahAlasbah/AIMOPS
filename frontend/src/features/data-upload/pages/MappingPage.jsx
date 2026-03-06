// frontend/src/features/data-upload/pages/MappingPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { analyzeSalesBatch, confirmSalesMappings } from "../../../api/data";
import MappingStep from "../components/MappingStep";
import { AnalyzeProgress } from "../components/Skeletons";

import { getCachedAnalysis, setCachedAnalysis } from "../utils/analysisCache";
import { buildConfirmMappingsPayload } from "../utils/confirmPayload";
import { normalizeRole } from "../utils/analysisUtils";

const LS_CONFIRMED_KEY = (batchId) => `sales_confirmed_mappings_v1_${batchId}`;
const LS_MAPPING_DRAFT_KEY = (batchId) => `sales_mapping_draft_v1_${batchId}`;

// ---------- helpers ----------
const safeParse = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const extractApiError = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return fallback;

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((d) => {
        const loc = Array.isArray(d.loc) ? d.loc.join(".") : "";
        return `${loc}: ${d.msg || "Invalid input"}`;
      })
      .join(" | ");
  }

  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  return fallback;
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

const buildColumnMapFromConfirmed = (analysis, confirmResult) => {
  const confirmedList = extractConfirmedMappingsList(confirmResult);
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

const mergeDraftIntoBase = (analysis, baseMap, draft) => {
  const next = { ...(baseMap || {}) };
  const cols = analysis?.columns || [];

  const draftColumnMap =
    draft?.columnMap && typeof draft.columnMap === "object" ? draft.columnMap : null;
  if (!draftColumnMap) return next;

  cols.forEach((c) => {
    const saved = draftColumnMap[c.index];
    if (!saved) return;

    const role = normalizeRole(saved.role);
    next[c.index] = {
      role,
      include: role === "skip" ? false : saved.include !== false,
      verified: saved.verified === true,
    };
  });

  return next;
};

const useFakeProgress = (active) => {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!active) {
      setPct(0);
      return;
    }

    let mounted = true;
    let t = null;

    setPct(0);

    t = window.setInterval(() => {
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
      if (t) window.clearInterval(t);
    };
  }, [active]);

  const finish = () => {
    setPct(100);
  };

  return { pct, finish, setPct };
};

export default function MappingPage() {
  const { t } = useTranslation("upload");
  const navigate = useNavigate();
  const { batchId } = useParams();
  const [searchParams] = useSearchParams();

  const refresh = searchParams.get("refresh") === "1";

  const [error, setError] = useState("");

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const [columnMap, setColumnMap] = useState({});
  const [requiredMissingMap, setRequiredMissingMap] = useState({});

  const [confirming, setConfirming] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);

  const { pct: analyzePct, finish: finishAnalyzePct } = useFakeProgress(analysisLoading);

  useEffect(() => {
    const run = async () => {
      if (!batchId) return;

      setError("");
      setAnalysisLoading(true);

      try {
        let res = null;

        if (!refresh) {
          const cached = getCachedAnalysis(batchId);
          if (cached) res = cached;
        }

        if (!res) {
          res = await analyzeSalesBatch(batchId);
          setCachedAnalysis(batchId, res);
        }

        setAnalysis(res);

        let confirmed = null;
        if (!refresh) {
          confirmed = safeParse(localStorage.getItem(LS_CONFIRMED_KEY(batchId)));
        }

        const base = buildBaseColumnMapFromAnalysis(res);

        if (confirmed?.success) {
          const fromConfirmed = buildColumnMapFromConfirmed(res, confirmed);
          setColumnMap(fromConfirmed);
          setRequiredMissingMap(buildRequiredMissingFromColumnMap(res, fromConfirmed));
          setAlreadyConfirmed(true);
          return;
        }

        let draft = null;
        if (!refresh) {
          draft = safeParse(localStorage.getItem(LS_MAPPING_DRAFT_KEY(batchId)));
        }

        if (draft) {
          const merged = mergeDraftIntoBase(res, base, draft);
          setColumnMap(merged);

          const rmDraft =
            draft?.requiredMissingMap && typeof draft.requiredMissingMap === "object"
              ? draft.requiredMissingMap
              : null;

          const rmInit = buildRequiredMissingInit(res);
          Object.keys(rmInit).forEach((k) => {
            const v = rmDraft?.[k];
            rmInit[k] = typeof v === "string" ? v : "";
          });

          setRequiredMissingMap(rmInit);
          setAlreadyConfirmed(false);
          return;
        }

        setColumnMap(base);
        setRequiredMissingMap(buildRequiredMissingInit(res));
        setAlreadyConfirmed(false);
      } catch (err) {
        const fallback = t("mappingPage.errorAnalyzeFailed");
        setError(extractApiError(err, fallback));
      } finally {
        finishAnalyzePct();
        window.setTimeout(() => setAnalysisLoading(false), 220);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, refresh]);

  useEffect(() => {
    if (!batchId) return;
    if (!analysis) return;
    if (alreadyConfirmed) return;

    try {
      const payload = {
        v: 1,
        saved_at: new Date().toISOString(),
        columnMap,
        requiredMissingMap,
      };
      localStorage.setItem(LS_MAPPING_DRAFT_KEY(batchId), JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [batchId, analysis, columnMap, requiredMissingMap, alreadyConfirmed]);

  const allColumnsOptions = useMemo(() => {
    const cols = analysis?.columns || [];
    return cols.map((c) => ({ value: String(c.index), label: c.name }));
  }, [analysis]);

  const needsVerificationSet = useMemo(() => {
    const set = new Set();
    (analysis?.classified?.needs_verification || []).forEach((c) => set.add(String(c.index)));
    return set;
  }, [analysis]);

  const setRole = (colIndex, roleRaw) => {
    if (alreadyConfirmed) return;

    const nextRole = normalizeRole(roleRaw);

    setColumnMap((prev) => {
      const prevEntry = prev[colIndex] || {};
      const prevRole = normalizeRole(prevEntry.role);

      const roleChanged = prevRole !== nextRole;
      const needsReconfirm = roleChanged && needsVerificationSet.has(String(colIndex));

      return {
        ...prev,
        [colIndex]: {
          ...prevEntry,
          role: nextRole,
          include: nextRole === "skip" ? false : true,
          verified: needsReconfirm ? false : !!prevEntry.verified,
        },
      };
    });
  };

  const confirmVerified = (colIndex) => {
    if (alreadyConfirmed) return;
    setColumnMap((prev) => ({
      ...prev,
      [colIndex]: { ...(prev[colIndex] || {}), verified: true },
    }));
  };

  const toggleInclude = (colIndex) => {
    if (alreadyConfirmed) return;
    setColumnMap((prev) => ({
      ...prev,
      [colIndex]: { ...(prev[colIndex] || {}), include: !prev[colIndex]?.include },
    }));
  };

  const setRequiredMissing = (requiredRole, colIndexStr) => {
    if (alreadyConfirmed) return;

    setRequiredMissingMap((prev) => ({ ...prev, [requiredRole]: colIndexStr }));

    const colIndex = Number(colIndexStr);
    if (!Number.isNaN(colIndex)) {
      const isNeedsVerification = needsVerificationSet.has(String(colIndex));

      setColumnMap((prev) => ({
        ...prev,
        [colIndex]: {
          ...(prev[colIndex] || {}),
          role: normalizeRole(requiredRole),
          include: true,
          verified: isNeedsVerification ? false : true,
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

      localStorage.setItem(LS_CONFIRMED_KEY(batchId), JSON.stringify(res));
      setAlreadyConfirmed(!!res?.success);

      try {
        localStorage.removeItem(LS_MAPPING_DRAFT_KEY(batchId));
      } catch {}

      navigate(`/app/data-upload/review/${batchId}`);
    } catch (err) {
      const fallback = t("mappingPage.errorConfirmFailed");
      setError(extractApiError(err, fallback));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="data-upload-page">
      <PageHeader
        title={t("mappingPage.title")}
        breadcrumbs={[
          {
            label: t("mappingPage.breadcrumbRoot"),
            link: true,
            onClick: () => navigate("/app/data-upload/uploads"),
          },
          { label: t("mappingPage.breadcrumbBatch", { batchId }), link: false },
        ]}
      />

      <Card>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        )}

        {alreadyConfirmed && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="success">
              {t("mappingPage.alreadyConfirmedInfo")}
            </InfoMessage>
          </div>
        )}

        {analysisLoading ? (
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