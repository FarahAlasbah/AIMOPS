// frontend/src/features/data-upload/pages/ReviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { analyzeSalesBatch, processSalesBatch } from "../../../api/data";
import ReviewStep from "../components/ReviewStep";

const LS_CONFIRMED_KEY = (batchId) => `sales_confirmed_mappings_v1_${batchId}`;

export default function ReviewPage() {
  const navigate = useNavigate();
  const { batchId } = useParams();

  const [error, setError] = useState("");

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const [confirmResult, setConfirmResult] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);

  useEffect(() => {
    if (!batchId) return;

    // load confirm result from localStorage (saved in MappingPage)
    try {
      const raw = localStorage.getItem(LS_CONFIRMED_KEY(batchId));
      setConfirmResult(raw ? JSON.parse(raw) : null);
    } catch {
      setConfirmResult(null);
    }

    // fetch analysis again (we need column names to build process body reliably)
    const run = async () => {
      setAnalysisLoading(true);
      setError("");
      try {
        const res = await analyzeSalesBatch(batchId);
        setAnalysis(res);
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Analyze failed.";
        setError(String(msg));
      } finally {
        setAnalysisLoading(false);
      }
    };

    run();
  }, [batchId]);

  const roleToOriginalName = useMemo(() => {
    const confirmed = confirmResult?.confirmed_mappings || [];
    const map = {};
    for (const m of confirmed) {
      if (m?.role && m?.original_name) map[String(m.role)] = String(m.original_name);
    }
    return map;
  }, [confirmResult]);

  const buildProcessPayload = () => {
    const cols = analysis?.columns || [];
    const mappedNames = new Set(Object.values(roleToOriginalName).filter(Boolean));

    const skip_columns = cols
      .map((c) => String(c.name))
      .filter((name) => name && !mappedNames.has(name));

    return {
      date_column: roleToOriginalName.date || "",
      product_column: roleToOriginalName.product_name || "",
      quantity_column: roleToOriginalName.quantity || "",
      price_column: roleToOriginalName.unit_price || "",
      total_amount_column: roleToOriginalName.total_amount || "",
      category_column: roleToOriginalName.category || "",
      skip_columns,
    };
  };

  const canProcess = useMemo(() => {
    if (!confirmResult?.success) return false;

    // basic check: at least date/product/quantity exist
    if (!roleToOriginalName.date) return false;
    if (!roleToOriginalName.product_name) return false;
    if (!roleToOriginalName.quantity) return false;

    return true;
  }, [confirmResult, roleToOriginalName]);

  const handleProcess = async () => {
    setError("");
    if (!batchId) return;

    try {
      setProcessing(true);

      const payload = buildProcessPayload();
      const res = await processSalesBatch(batchId, payload);

      setProcessResult(res);
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
        title="Confirm and Process"
        breadcrumbs={[
          { label: "Upload Sales Data", link: true, onClick: () => navigate("/app/data-upload/uploads") },
          { label: `Batch ${batchId}`, link: false },
        ]}
      />

      <Card>
        {analysisLoading && (
          <div style={{ marginBottom: 12 }}>
            <InfoMessage type="info">Loading analysis...</InfoMessage>
          </div>
        )}

        {!confirmResult?.success && (
          <div style={{ marginBottom: 12 }}>
            <InfoMessage type="warn">
              No confirmed mappings found for this batch on this device. Go back and confirm mappings again.
            </InfoMessage>
          </div>
        )}

        {!canProcess && confirmResult?.success && (
          <div style={{ marginBottom: 12 }}>
            <InfoMessage type="info">
              Processing needs at least: date, product_name, quantity. Confirm mappings if something is missing.
            </InfoMessage>
          </div>
        )}

        <ReviewStep
          batchId={batchId}
          confirming={false}
          confirmResult={confirmResult}
          processing={processing}
          processResult={processResult}
          error={error}
          onBack={() => navigate(`/app/data-upload/map/${batchId}`)}
          onProcess={canProcess ? handleProcess : () => {}}
          onFinish={() => navigate("/app/data-upload/uploads")}
        />
      </Card>
    </div>
  );
}
