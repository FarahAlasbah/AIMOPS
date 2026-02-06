// frontend/src/features/data-upload/pages/UploadsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, PageHeader, Button } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { uploadSalesData, getUploadsPage } from "../../../api/data";
import UploadStep from "../components/UploadStep";
import UploadsList from "../components/UploadsList";

import { MAX_MB, getFileKey, readDedupeSet, writeDedupeSet, validateSelectedFile } from "../utils/fileUtils";
import { getCachedAnalysis, clearCachedAnalysis } from "../utils/analysisCache";

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

export default function UploadsPage() {
  const navigate = useNavigate();

  const [selectedCampaign, setSelectedCampaign] = useState("");

  const [pickedFile, setPickedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(1);

  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // backend pagination
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [hasNext, setHasNext] = useState(false);

  const campaignOptions = useMemo(
    () => [
      { value: "1", label: "Summer Sale 2025" },
      { value: "2", label: "Ramadan Special" },
      { value: "3", label: "Back to School" },
    ],
    []
  );

  const fetchUploads = async (nextOffset = offset) => {
    setUploadsLoading(true);
    try {
      const res = await getUploadsPage({ limit, offset: nextOffset });
      const list = Array.isArray(res) ? res.map(normalizeUpload) : [];

      // if backend returns exactly limit, assume there may be next page
      setHasNext(list.length === limit);

      // keep stable ordering (newest first)
      list.sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")));
      setUploads(list);
    } catch (e) {
      setError((prev) => prev || "Failed to load uploads list.");
    } finally {
      setUploadsLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads(offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const handleFileSelect = (file) => {
    setError("");

    if (!file) {
      setPickedFile(null);
      return;
    }

    const validation = validateSelectedFile(file);
    if (!validation.ok) {
      setPickedFile(null);
      setError(validation.message);
      return;
    }

    const fileKey = getFileKey(file);
    const dedupe = readDedupeSet();
    if (dedupe.has(fileKey)) {
      setPickedFile(null);
      setError("This file was already uploaded before. Please choose a different file.");
      return;
    }

    setPickedFile(file);
  };

  const handleUpload = async () => {
    setError("");

    if (!pickedFile) {
      setError("Please select a file first.");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      await uploadSalesData({
        file: pickedFile,
        campaignId: selectedCampaign || undefined,
        onProgress: setProgress,
      });

      // mark dedupe
      const dedupe = readDedupeSet();
      dedupe.add(getFileKey(pickedFile));
      writeDedupeSet(dedupe);

      // refresh first page (newest)
      setOffset(0);
      await fetchUploads(0);

      // clear picker fully
      setPickedFile(null);
      setProgress(0);
      setFileInputKey((k) => k + 1);
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
          fileInputKey={fileInputKey}
          onCancel={() => {
            setPickedFile(null);
            setError("");
            setProgress(0);
            setFileInputKey((k) => k + 1);
          }}
          onUpload={handleUpload}
        />

        <div style={{ marginTop: 18 }}>
          <div className="uploads-header">
            <div style={{ fontWeight: 800, color: "#111827" }}>Uploads</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                onClick={() => fetchUploads(offset)}
                disabled={uploadsLoading}
              >
                {uploadsLoading ? "Refreshing..." : "Refresh"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                disabled={uploadsLoading || offset === 0}
              >
                Prev
              </Button>

              <Button
                variant="secondary"
                onClick={() => setOffset((o) => o + limit)}
                disabled={uploadsLoading || !hasNext}
              >
                Next
              </Button>
            </div>
          </div>

          <UploadsList
            uploads={uploads}
            hasLocalMapping={hasLocalMapping}
            hasCachedAnalysis={hasCachedAnalysis}
            onAnalyze={(id) => navigate(`/app/data-upload/map/${id}`)}
            onReview={(id) => navigate(`/app/data-upload/review/${id}`)}
            onRefreshAnalysis={(id) => navigate(`/app/data-upload/map/${id}?refresh=1`)}
            onClearLocal={clearLocalForBatch}
          />

          <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
            Offset: {offset} • Limit: {limit}
          </div>
        </div>
      </Card>
    </div>
  );
}
