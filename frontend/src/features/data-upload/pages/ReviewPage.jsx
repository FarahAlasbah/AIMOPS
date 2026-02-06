// frontend/src/features/data-upload/pages/ReviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, PageHeader, Button, FormActions } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { analyzeSalesBatch, processSalesBatch } from "../../../api/data";
import { getCachedAnalysis, setCachedAnalysis } from "../utils/analysisCache";
import { buildProcessPayload } from "../utils/processPayload";

import "./DataUpload.css";

const LS_MAPPING_KEY = (batchId) => `sales_batch_mapping_v1_${batchId}`;

export default function ReviewPage() {
  const navigate = useNavigate();
  const { batchId } = useParams();

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [mapping, setMapping] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!batchId) return;

      setError("");
      setInfo("");

      // mapping from localStorage
      let local = null;
      try {
        const raw = localStorage.getItem(LS_MAPPING_KEY(batchId));
        local = raw ? JSON.parse(raw) : null;
      } catch {
        local = null;
      }
      setMapping(local);

      // analysis from cache or backend
      const cached = getCachedAnalysis(batchId);
      if (cached) {
        setAnalysis(cached);
        return;
      }

      try {
        const res = await analyzeSalesBatch(batchId);
        setAnalysis(res);
        setCachedAnalysis(batchId, res);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load analysis.";
        setError(String(msg));
      }
    };

    run();
  }, [batchId]);

  const columnMap = useMemo(() => {
    const m = {};
    const list = mapping?.mappings || [];
    list.forEach((x) => {
      m[x.index] = {
        role: x.role,
        include: !!x.include,
        verified: !!x.verified,
      };
    });
    return m;
  }, [mapping]);

  const payload = useMemo(() => {
    if (!analysis) return null;
    return buildProcessPayload({ analysis, columnMap });
  }, [analysis, columnMap]);

  const canProcess = !!payload && !!analysis;

  const handleProcess = async () => {
    setError("");
    setInfo("");
    setResult(null);

    if (!batchId) return;
    if (!payload) {
      setError("Missing payload. Please go back and confirm mapping again.");
      return;
    }

    // quick frontend validation (avoid 422)
    const required = [
      ["date_column", payload.date_column],
      ["product_column", payload.product_column],
      ["quantity_column", payload.quantity_column],
      ["price_column", payload.price_column],
      ["total_amount_column", payload.total_amount_column],
      ["category_column", payload.category_column],
    ];

    for (const [k, v] of required) {
      if (!v) {
        setError(`Missing required field: ${k}. Please go back and map columns.`);
        return;
      }
    }

    try {
      setProcessing(true);
      const res = await processSalesBatch(batchId, payload);
      setResult(res);
      setInfo(res?.message || "Processed.");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Process failed.";
      setError(String(msg));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="data-upload-page">
      <PageHeader
        title="Review & Process"
        breadcrumbs={[
          { label: "Upload Sales Data", link: true, onClick: () => navigate("/app/data-upload/uploads") },
          { label: "Map Columns", link: true, onClick: () => navigate(`/app/data-upload/map/${batchId}`) },
          { label: `Review Batch ${batchId}`, link: false },
        ]}
      />

      <Card>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        )}

        {info && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="info">{info}</InfoMessage>
          </div>
        )}

        {!mapping && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="info">
              No local mapping found for this batch. Please go back to mapping and confirm.
            </InfoMessage>
          </div>
        )}

        {payload && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: "#111827", marginBottom: 10 }}>Payload Preview</div>
            <div className="mapping-card">
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <FormActions>
          <Button variant="secondary" onClick={() => navigate(`/app/data-upload/map/${batchId}`)} disabled={processing}>
            Back
          </Button>

          <Button variant="primary" onClick={handleProcess} disabled={!canProcess || processing}>
            {processing ? "Processing..." : "Process File"}
          </Button>

          <Button variant="secondary" onClick={() => navigate("/app/data-upload/uploads")} disabled={processing}>
            Finish
          </Button>
        </FormActions>

        {result?.statistics && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, color: "#111827", marginBottom: 10 }}>Result</div>

            <div className="mapping-card">
              <div className="chip-row" style={{ marginTop: 0 }}>
                <span className="chip">Status: {result?.status || "-"}</span>
                <span className="chip">Total rows: {result?.statistics?.total_rows ?? "-"}</span>
                <span className="chip good">Valid rows: {result?.statistics?.valid_rows ?? "-"}</span>
                <span className="chip warn">Rejected rows: {result?.statistics?.rejected_rows ?? "-"}</span>
                <span className="chip">
                  Success rate: {result?.statistics?.success_rate ?? "-"}%
                </span>
              </div>

              {result?.date_range && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#374151" }}>
                  Date range: {result.date_range.start} → {result.date_range.end}
                </div>
              )}

              {typeof result?.processing_time_seconds === "number" && (
                <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                  Processing time: {result.processing_time_seconds}s
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
