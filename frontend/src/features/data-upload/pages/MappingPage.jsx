// frontend/src/features/data-upload/pages/MappingPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Card, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { analyzeSalesBatch } from "../../../api/data";

import MappingStep from "../components/MappingStep";

import { getCachedAnalysis, setCachedAnalysis } from "../utils/analysisCache";

import "./DataUpload.css";

const LS_MAPPING_KEY = (batchId) => `sales_batch_mapping_v1_${batchId}`;

export default function MappingPage() {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const [searchParams] = useSearchParams();

  const refresh = searchParams.get("refresh") === "1";

  const [error, setError] = useState("");

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const [columnMap, setColumnMap] = useState({});
  const [requiredMissingMap, setRequiredMissingMap] = useState({});

  useEffect(() => {
    const run = async () => {
      if (!batchId) return;

      setError("");
      setAnalysisLoading(true);

      try {
        if (!refresh) {
          const cached = getCachedAnalysis(batchId);
          if (cached) {
            setAnalysis(cached);

            const initial = {};
            (cached?.columns || []).forEach((c) => {
              initial[c.index] = {
                role: c.role || "skip",
                include: !!c.auto_include,
                verified: !c.verification_needed,
              };
            });
            setColumnMap(initial);

            const rm = {};
            (cached?.classified?.required_missing || []).forEach((r) => {
              rm[r.role] = "";
            });
            setRequiredMissingMap(rm);

            setAnalysisLoading(false);
            return;
          }
        }

        const res = await analyzeSalesBatch(batchId);
        setAnalysis(res);
        setCachedAnalysis(batchId, res);

        const initial = {};
        (res?.columns || []).forEach((c) => {
          initial[c.index] = {
            role: c.role || "skip",
            include: !!c.auto_include,
            verified: !c.verification_needed,
          };
        });
        setColumnMap(initial);

        const rm = {};
        (res?.classified?.required_missing || []).forEach((r) => {
          rm[r.role] = "";
        });
        setRequiredMissingMap(rm);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Analyze failed.";
        setError(String(msg));
      } finally {
        setAnalysisLoading(false);
      }
    };

    run();
  }, [batchId, refresh]);

  const allColumnsOptions = useMemo(() => {
    const cols = analysis?.columns || [];
    return cols.map((c) => ({ value: String(c.index), label: c.name }));
  }, [analysis]);

  const setRole = (colIndex, role) => {
    setColumnMap((prev) => ({
      ...prev,
      [colIndex]: { ...(prev[colIndex] || {}), role, include: role === "skip" ? false : true },
    }));
  };

  const confirmVerified = (colIndex) => {
    setColumnMap((prev) => ({
      ...prev,
      [colIndex]: { ...(prev[colIndex] || {}), verified: true },
    }));
  };

  const toggleInclude = (colIndex) => {
    setColumnMap((prev) => ({
      ...prev,
      [colIndex]: { ...(prev[colIndex] || {}), include: !prev[colIndex]?.include },
    }));
  };

  const setRequiredMissing = (requiredRole, colIndexStr) => {
    setRequiredMissingMap((prev) => ({ ...prev, [requiredRole]: colIndexStr }));

    const colIndex = Number(colIndexStr);
    if (!Number.isNaN(colIndex)) {
      setColumnMap((prev) => ({
        ...prev,
        [colIndex]: { ...(prev[colIndex] || {}), role: requiredRole, include: true, verified: true },
      }));
    }
  };

  const canConfirm = useMemo(() => {
    if (!analysis) return false;

    const needsVerification = analysis?.classified?.needs_verification || [];
    for (const c of needsVerification) {
      if (!columnMap?.[c.index]?.verified) return false;
    }

    const needsMapping = analysis?.classified?.needs_mapping || [];
    for (const c of needsMapping) {
      const role = columnMap?.[c.index]?.role;
      if (!role || role === "skip") return false;
    }

    const requiredMissing = analysis?.classified?.required_missing || [];
    for (const r of requiredMissing) {
      if (!requiredMissingMap?.[r.role]) return false;
    }

    return true;
  }, [analysis, columnMap, requiredMissingMap]);

  const handleConfirm = () => {
    setError("");
    if (!analysis || !batchId) return;

    const mappings = (analysis.columns || []).map((c) => ({
      index: c.index,
      name: c.name,
      role: columnMap?.[c.index]?.role || "skip",
      include: !!columnMap?.[c.index]?.include,
      verified: !!columnMap?.[c.index]?.verified,
    }));

    const payload = {
      batch_id: batchId,
      mappings,
      required_missing: requiredMissingMap,
    };

    localStorage.setItem(LS_MAPPING_KEY(batchId), JSON.stringify(payload));

    navigate(`/app/data-upload/review/${batchId}`);
  };

  return (
    <div className="data-upload-page">
      <PageHeader
        title="Map Columns"
        breadcrumbs={[
          { label: "Upload Sales Data", link: true, onClick: () => navigate("/app/data-upload/uploads") },
          { label: `Batch ${batchId}`, link: false },
        ]}
      />

      <Card>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        )}

        <MappingStep
          analysisLoading={analysisLoading}
          analysis={analysis}
          allColumnsOptions={allColumnsOptions}
          columnMap={columnMap}
          requiredMissingMap={requiredMissingMap}
          onBack={() => navigate("/app/data-upload/uploads")}
          onSetRole={setRole}
          onConfirmVerified={confirmVerified}
          onToggleInclude={toggleInclude}
          onPickRequiredMissing={setRequiredMissing}
          canConfirm={canConfirm}
          onConfirm={handleConfirm}
        />
      </Card>
    </div>
  );
}
