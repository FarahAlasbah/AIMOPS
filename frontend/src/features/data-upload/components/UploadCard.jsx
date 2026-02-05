import { Button } from "../../../shared/components";

export default function UploadCard({
  upload,
  hasLocalMapping,
  hasCachedAnalysis,
  onAnalyze,
  onReview,
  onRefreshAnalysis,
  onDelete,
}) {
  const uploadedAt = upload?.uploadedAt ? new Date(upload.uploadedAt) : null;

  return (
    <div className="upload-card">
      <div className="upload-card-top">
        <div className="upload-card-title">{upload?.fileName || "Untitled file"}</div>
        <div className="upload-card-sub">
          Batch ID: <strong>{upload?.batchId}</strong>
          {uploadedAt ? ` • ${uploadedAt.toLocaleString()}` : ""}
        </div>
      </div>

      <div className="chip-row" style={{ marginTop: 10 }}>
        <span className={`chip ${hasLocalMapping ? "good" : "warn"}`}>
          Mapping: {hasLocalMapping ? "Saved" : "Not saved"}
        </span>

        <span className={`chip ${hasCachedAnalysis ? "good" : ""}`}>
          Analysis: {hasCachedAnalysis ? "Cached" : "Not analyzed"}
        </span>

        {upload?.status && <span className="chip">Status: {upload.status}</span>}

        {upload?.campaignLabel && <span className="chip">Campaign: {upload.campaignLabel}</span>}
      </div>

      <div className="upload-card-actions">
        <Button variant="primary" onClick={() => onAnalyze(upload.batchId)}>
          Analyze / Map
        </Button>

        <Button variant="secondary" onClick={() => onReview(upload.batchId)} disabled={!hasLocalMapping}>
          Review
        </Button>

        <Button variant="secondary" onClick={() => onRefreshAnalysis(upload.batchId)}>
          Refresh analysis
        </Button>

        <Button variant="secondary" onClick={() => onDelete(upload.batchId)}>
          Remove
        </Button>
      </div>
    </div>
  );
}
