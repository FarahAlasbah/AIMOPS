import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, PageHeader, Button } from "../../../shared/components";
import Stepper from "../../../shared/components/Stepper";
import InfoMessage from "../../../shared/components/InfoMessage";

import { uploadSalesData, analyzeSalesBatch, submitSalesMapping, getAllUploads } from "../../../api/data";

import UploadStep from "../components/UploadStep";
import MappingStep from "../components/MappingStep";
import ReviewStep from "../components/ReviewStep";
import UploadsList from "../components/UploadsList";

import { MAX_MB, getFileKey, readDedupeSet, writeDedupeSet, validateSelectedFile } from "../utils/fileUtils";
import { getCachedAnalysis, setCachedAnalysis, clearCachedAnalysis } from "../utils/analysisCache";

import "./DataUpload.css";

const LS_MAPPING_KEY = (batchId) => `sales_batch_mapping_v1_${batchId}`;

const normalizeUpload = (u) => ({
  batchId: u?.batch_id ?? u?.batchId,
  fileName: u?.file_name ?? u?.fileName,
  fileType: u?.file_type ?? u?.fileType,
  fileSizeKb: u?.file_size_kb ?? u?.fileSizeKb,
  status: u?.status,
  uploadedAt: u?.uploaded_at ?? u?.uploadedAt,
  validRows: u?.valid_rows ?? u?.validRows,
  rejectedRows: u?.rejected_rows ?? u?.rejectedRows,
});

export default function DataUpload() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");

  const [batchId, setBatchId] = useState(null);
  const [forceRefreshAnalysis, setForceRefreshAnalysis] = useState(false);

  const [error, setError] = useState("");

  // upload progress
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // analysis
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  // mapping state
  const [columnMap, setColumnMap] = useState({});
  const [requiredMissingMap, setRequiredMissingMap] = useState({});

  const [submitWarning, setSubmitWarning] = useState("");

  // uploads list state (from backend)
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploads, setUploads] = useState([]);

  const steps = ["Upload", "Map Columns", "Review"];

  const campaignOptions = useMemo(
    () => [
      { value: "1", label: "Summer Sale 2025" },
      { value: "2", label: "Ramadan Special" },
      { value: "3", label: "Back to School" },
    ],
    []
  );

  const fetchUploads = async () => {
    setUploadsLoading(true);
    try {
      const res = await getAllUploads();
      const list = Array.isArray(res) ? res.map(normalizeUpload) : [];
      // newest first (backend seems already newest first, but keep it stable)
      list.sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")));
      setUploads(list);
    } catch (e) {
      // don't hard-fail the page if uploads fetch fails
      setError((prev) => prev || "Failed to load uploads list.");
    } finally {
      setUploadsLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const resetToUploadStep = () => {
    setCurrentStep(1);
    setBatchId(null);
    setAnalysis(null);
    setAnalysisLoading(false);
    setColumnMap({});
    setRequiredMissingMap({});
    setSubmitWarning("");
    setForceRefreshAnalysis(false);
  };

  const handleFileSelect = (file) => {
    setError("");
    if (!file) {
      setUploadedFile(null);
      return;
    }

    const validation = validateSelectedFile(file);
    if (!validation.ok) {
      setUploadedFile(null);
      setError(validation.message);
      return;
    }

    const fileKey = getFileKey(file);
    const dedupe = readDedupeSet();
    if (dedupe.has(fileKey)) {
      setUploadedFile(null);
      setError("This file was already uploaded before. Please choose a different file.");
      return;
    }

    setUploadedFile(file);
  };

  const handleUpload = async () => {
    setError("");
    setSubmitWarning("");

    if (!uploadedFile) {
      setError("Please select a file first.");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      await uploadSalesData({
        file: uploadedFile,
        campaignId: selectedCampaign || undefined,
        onProgress: setProgress,
      });

      // frontend dedupe mark
      const dedupe = readDedupeSet();
      dedupe.add(getFileKey(uploadedFile));
      writeDedupeSet(dedupe);

      // refresh list from backend
      await fetchUploads();

      // reset file picker but stay in step 1
      setUploadedFile(null);
      setProgress(0);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Upload failed.";

      if (err?.response?.status === 409) setError("Duplicate upload detected. This file was already processed.");
      else setError(String(msg));
    } finally {
      setUploading(false);
    }
  };

  const openMappingForBatch = (id, { refresh = false } = {}) => {
    setError("");
    setSubmitWarning("");
    setBatchId(id);
    setForceRefreshAnalysis(!!refresh);
    setCurrentStep(2);
  };

  const openReviewForBatch = (id) => {
    setError("");
    setSubmitWarning("");
    setBatchId(id);
    setCurrentStep(3);
  };

  // Step 2 analysis: load from cache unless refresh requested
  useEffect(() => {
    const run = async () => {
      if (currentStep !== 2 || !batchId) return;

      setError("");
      setAnalysisLoading(true);

      try {
        if (!forceRefreshAnalysis) {
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

        // patch local uploads list UI immediately
        setUploads((prev) =>
          prev.map((u) =>
            String(u.batchId) === String(batchId)
              ? { ...u, status: res?.status || u.status, fileName: res?.file_name || u.fileName }
              : u
          )
        );

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
        setForceRefreshAnalysis(false);
      }
    };

    run();
  }, [currentStep, batchId, forceRefreshAnalysis]);

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

  const handleConfirmMapping = async () => {
    setError("");
    setSubmitWarning("");

    if (!analysis || !batchId) return;

    const mappings = (analysis.columns || []).map((c) => ({
      index: c.index,
      name: c.name,
      role: columnMap?.[c.index]?.role || "skip",
      include: !!columnMap?.[c.index]?.include,
    }));

    const payload = {
      batch_id: batchId,
      mappings,
      required_missing: requiredMissingMap,
    };

    localStorage.setItem(LS_MAPPING_KEY(batchId), JSON.stringify(payload));

    try {
      await submitSalesMapping(batchId, payload);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Mapping submit failed.";
      setSubmitWarning(`Saved locally, but backend submit failed: ${String(msg)}`);
    }

    setCurrentStep(3);
  };

  const hasLocalMapping = (id) => {
    try {
      return !!localStorage.getItem(LS_MAPPING_KEY(id));
    } catch {
      return false;
    }
  };

  const hasCachedAnalysis = (id) => !!getCachedAnalysis(id);

  const clearLocalForBatch = (id) => {
    clearCachedAnalysis(id);
    try {
      localStorage.removeItem(LS_MAPPING_KEY(id));
    } catch {}
    // no backend delete endpoint shown, so we only clear local data
  };

  return (
    <div className="data-upload-page">
      <PageHeader
        title="Upload Campaign Sales Data"
        breadcrumbs={[
          { label: "Campaigns", link: true, onClick: () => navigate("/app/campaigns") },
          { label: "Upload Sales Data", link: false },
        ]}
      />

      <Stepper steps={steps} currentStep={currentStep} />

      <Card>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        )}

        {currentStep === 1 && (
          <>
            <UploadStep
              campaignOptions={campaignOptions}
              selectedCampaign={selectedCampaign}
              onCampaignChange={(e) => setSelectedCampaign(e.target.value)}
              uploadedFile={uploadedFile}
              onFileSelect={handleFileSelect}
              uploading={uploading}
              progress={progress}
              maxMb={MAX_MB}
              onCancel={() => {
                setUploadedFile(null);
                setError("");
                setProgress(0);
              }}
              onUpload={handleUpload}
            />

            <div style={{ marginTop: 18 }}>
              <div className="uploads-header">
                <div style={{ fontWeight: 800, color: "#111827" }}>Uploads</div>
                <Button variant="secondary" onClick={fetchUploads} disabled={uploadsLoading}>
                  {uploadsLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>

              <UploadsList
                uploads={uploads}
                hasLocalMapping={hasLocalMapping}
                hasCachedAnalysis={hasCachedAnalysis}
                onAnalyze={(id) => openMappingForBatch(id, { refresh: false })}
                onReview={(id) => openReviewForBatch(id)}
                onRefreshAnalysis={(id) => openMappingForBatch(id, { refresh: true })}
                onClearLocal={clearLocalForBatch}
              />
            </div>
          </>
        )}

        {currentStep === 2 && (
          <MappingStep
            analysisLoading={analysisLoading}
            analysis={analysis}
            allColumnsOptions={allColumnsOptions}
            columnMap={columnMap}
            requiredMissingMap={requiredMissingMap}
            onBack={() => resetToUploadStep()}
            onSetRole={setRole}
            onConfirmVerified={confirmVerified}
            onToggleInclude={toggleInclude}
            onPickRequiredMissing={setRequiredMissing}
            canConfirm={canConfirm}
            onConfirm={handleConfirmMapping}
          />
        )}

        {currentStep === 3 && (
          <ReviewStep
            batchId={batchId}
            submitWarning={submitWarning}
            onBack={() => setCurrentStep(2)}
            onFinish={() => resetToUploadStep()}
          />
        )}
      </Card>
    </div>
  );
}
