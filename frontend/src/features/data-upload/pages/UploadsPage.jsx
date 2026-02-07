// frontend/src/features/data-upload/pages/UploadsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, PageHeader, Button } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { uploadSalesData, getUploadsPage } from "../../../api/data";
import UploadStep from "../components/UploadStep";
import UploadsList from "../components/UploadsList";

import {
  MAX_MB,
  getFileKey,
  readDedupeSet,
  writeDedupeSet,
  validateSelectedFile,
} from "../utils/fileUtils";
import { getCachedAnalysis, clearCachedAnalysis } from "../utils/analysisCache";

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

const LS_CONFIRMED_KEY = (batchId) => `sales_confirmed_mappings_v1_${batchId}`;

const extractApiError = (err, fallback = "Something went wrong.") => {
  const data = err?.response?.data;

  // FastAPI/Pydantic validation errors: { detail: [ ... ] }
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((d) => {
        const loc = Array.isArray(d?.loc) ? d.loc.join(".") : "";
        const msg = d?.msg || "Invalid input";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join(" | ");
  }

  // FastAPI common: { detail: "..." }
  if (typeof data?.detail === "string") return data.detail;

  // Your case: { detail: { message, existing_batch, ... } }
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

const getExistingBatchIdFrom409 = (err) => {
  const id = err?.response?.data?.detail?.existing_batch?.batch_id;
  return typeof id === "number" || typeof id === "string" ? String(id) : "";
};

export default function UploadsPage() {
  const navigate = useNavigate();

  const [error, setError] = useState("");

  // upload form
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // force reset FileUpload by key after successful upload
  const [fileInputKey, setFileInputKey] = useState(1);

  // uploads pagination
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const campaignOptions = useMemo(
    () => [
      { value: "1", label: "Summer Sale 2025" },
      { value: "2", label: "Ramadan Special" },
      { value: "3", label: "Back to School" },
    ],
    []
  );

  const fetchUploads = async ({ nextOffset } = {}) => {
    const off = typeof nextOffset === "number" ? nextOffset : offset;

    setUploadsLoading(true);
    setError("");
    try {
      const res = await getUploadsPage({ limit, offset: off });
      const list = Array.isArray(res) ? res.map(normalizeUpload) : [];

      // newest first (keep stable)
      list.sort((a, b) =>
        String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || ""))
      );
      setUploads(list);

      // best-effort "hasNext": if we got a full page, assume next exists
      setHasNext(list.length === limit);
    } catch (e) {
      setError(extractApiError(e, "Failed to load uploads list."));
      setUploads([]);
      setHasNext(false);
    } finally {
      setUploadsLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads({ nextOffset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // mark as uploaded locally (dedupe)
      const dedupe = readDedupeSet();
      dedupe.add(getFileKey(uploadedFile));
      writeDedupeSet(dedupe);

      // refresh list
      await fetchUploads({ nextOffset: 0 });
      setOffset(0);

      // clear selection and reset FileUpload UI
      setUploadedFile(null);
      setProgress(0);
      setFileInputKey((k) => k + 1);
    } catch (err) {
      // Handle backend duplicate upload (409 Conflict)
      if (err?.response?.status === 409) {
        const existingId = getExistingBatchIdFrom409(err);
        const msg = extractApiError(err, "This file was already uploaded.");

        // Add to local dedupe too (so next time user selects it, they get blocked early)
        try {
          const dedupe = readDedupeSet();
          dedupe.add(getFileKey(uploadedFile));
          writeDedupeSet(dedupe);
        } catch {}

        // Refresh list so user can see the existing batch
        await fetchUploads({ nextOffset: 0 });
        setOffset(0);

        // Reset file input (prevents stuck state)
        setUploadedFile(null);
        setProgress(0);
        setFileInputKey((k) => k + 1);

        // Either show a clean message OR jump directly to the existing batch
        if (existingId) {
          // Navigate to mapping for the existing batch (best UX for duplicates)
          navigate(`/app/data-upload/map/${existingId}`);
          return;
        }

        setError(msg);
        return;
      }

      // All other errors (always stringify safely)
      setError(extractApiError(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const hasLocalMapping = (batchId) => {
    try {
      return !!localStorage.getItem(LS_CONFIRMED_KEY(batchId));
    } catch {
      return false;
    }
  };

  const hasCachedAnalysis = (batchId) => !!getCachedAnalysis(batchId);

  const clearLocalForBatch = (batchId) => {
    clearCachedAnalysis(batchId);
    try {
      localStorage.removeItem(LS_CONFIRMED_KEY(batchId));
    } catch {}
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

      <Card>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        )}

        <UploadStep
          campaignOptions={campaignOptions}
          selectedCampaign={selectedCampaign}
          onCampaignChange={(e) => setSelectedCampaign(e.target.value)}
          onFileSelect={handleFileSelect}
          uploading={uploading}
          progress={progress}
          maxMb={MAX_MB}
          onCancel={() => {
            setUploadedFile(null);
            setError("");
            setProgress(0);
            setFileInputKey((k) => k + 1);
          }}
          onUpload={handleUpload}
          fileInputKey={fileInputKey}
          canUpload={!!uploadedFile}
        />

        <div style={{ marginTop: 18 }}>
          <div className="uploads-header">
            <div style={{ fontWeight: 800, color: "#111827" }}>Uploads</div>
            <Button
              variant="secondary"
              onClick={() => fetchUploads({ nextOffset: offset })}
              disabled={uploadsLoading}
            >
              {uploadsLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <UploadsList
            uploads={uploads}
            loading={uploadsLoading}
            limit={limit}
            offset={offset}
            hasNext={hasNext}
            onPrev={() => {
              const nextOff = Math.max(0, offset - limit);
              setOffset(nextOff);
              fetchUploads({ nextOffset: nextOff });
            }}
            onNext={() => {
              const nextOff = offset + limit;
              setOffset(nextOff);
              fetchUploads({ nextOffset: nextOff });
            }}
            hasLocalMapping={hasLocalMapping}
            hasCachedAnalysis={hasCachedAnalysis}
            onAnalyze={(id) => navigate(`/app/data-upload/map/${id}`)}
            onReview={(id) => navigate(`/app/data-upload/review/${id}`)}
            onRefreshAnalysis={(id) => navigate(`/app/data-upload/map/${id}?refresh=1`)}
            onClearLocal={clearLocalForBatch}
          />
        </div>
      </Card>
    </div>
  );
}
