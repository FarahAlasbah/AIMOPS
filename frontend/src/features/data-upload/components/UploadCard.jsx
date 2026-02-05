import { Button } from "../../../shared/components";

const kbToMb = (kb) => {
  const n = Number(kb);
  if (Number.isNaN(n)) return "-";
  return `${(n / 1024).toFixed(1)} MB`;
};

export default function UploadCard({
  upload,
  hasLocalMapping,
  hasCachedAnalysis,
  onAnalyze,
  onReview,
  onRefreshAnalysis,
  onClearLocal,
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

        <div className="upload-card-meta">
          <span className="meta-pill">Type: {upload?.fileType || "-"}</span>
          <span className="meta-pill">Size: {kbToMb(upload?.fileSizeKb)}</span>
          <span className="meta-pill">Status: {upload?.status || "-"}</span>
          <span className="meta-pill">
            Rows: {upload?.validRows ?? 0} valid / {upload?.rejectedRows ?? 0} rejected
          </span>
        </div>
      </div>

      <div className="chip-row" style={{ marginTop: 10 }}>
        <span className={`chip ${hasLocalMapping ? "good" : "warn"}`}>
          Mapping: {hasLocalMapping ? "Saved" : "Not saved"}
        </span>

        <span className={`chip ${hasCachedAnalysis ? "good" : ""}`}>
          Analysis: {hasCachedAnalysis ? "Cached" : "Not cached"}
        </span>
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

        <Button variant="secondary" onClick={() => onClearLocal(upload.batchId)}>
          Clear local
        </Button>
      </div>
    </div>
  );
}
