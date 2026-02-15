// frontend/src/features/data-upload/components/UploadCard.jsx
import { Button } from "../../../shared/components";

const kbToMb = (kb) => {
  const n = Number(kb);
  if (Number.isNaN(n)) return "-";
  return `${(n / 1024).toFixed(1)} MB`;
};

const fmtStatus = (s) => {
  const v = String(s || "unknown").trim();
  if (!v) return "unknown";
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const statusClass = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "processed" || v === "done" || v === "success") return "good";
  if (v === "pending" || v === "mapping") return "warn";
  if (v === "failed" || v === "error" || v === "rejected") return "bad";
  return "";
};

export default function UploadCard({
  upload,
  hasLocalMapping,
  hasCachedAnalysis,
  onAnalyze,
  onReview,
  onRefreshAnalysis,
  onClearLocal,

  onDelete, // NEW
  deleting, // NEW
}) {
  const status = upload?.status || "unknown";
  const busy = !!deleting;

  return (
    <div className="upload-card">
      <div className="upload-card-head">
        <div className="upload-card-title-row">
          <div className="upload-card-title">{upload?.fileName || "Untitled file"}</div>
          <span className={`status-pill ${statusClass(status)}`}>{fmtStatus(status)}</span>
        </div>
      </div>

      <div className="upload-kv-grid">
        <div className="upload-kv">
          <div className="upload-k">Type</div>
          <div className="upload-v">{upload?.fileType || "-"}</div>
        </div>

        <div className="upload-kv">
          <div className="upload-k">Size</div>
          <div className="upload-v">{kbToMb(upload?.fileSizeKb)}</div>
        </div>

        <div className="upload-kv">
          <div className="upload-k">Valid rows</div>
          <div className="upload-v">{upload?.validRows ?? 0}</div>
        </div>

        <div className="upload-kv">
          <div className="upload-k">Rejected rows</div>
          <div className="upload-v">{upload?.rejectedRows ?? 0}</div>
        </div>
      </div>

      <div className="upload-flags">
        <span className={`chip ${hasLocalMapping ? "good" : "warn"}`}>
          Mappings: {hasLocalMapping ? "Saved" : "Not saved"}
        </span>

        <span className={`chip ${hasCachedAnalysis ? "good" : ""}`}>
          Analysis: {hasCachedAnalysis ? "Cached" : "Not cached"}
        </span>
      </div>

      <div className="upload-actions-row">
        <div className="upload-actions-main">
          <Button variant="primary" onClick={() => onAnalyze(upload.batchId)} disabled={busy}>
            {busy ? "Deleting..." : "Analyze / Map"}
          </Button>

          <Button
            variant="secondary"
            onClick={() => onReview(upload.batchId)}
            disabled={!hasLocalMapping || busy}
          >
            Products
          </Button>
        </div>

        <div className="upload-actions-aux">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onRefreshAnalysis(upload.batchId)}
            disabled={busy}
          >
            Refresh analysis
          </button>

          <button
            type="button"
            className="ghost-btn"
            onClick={() => onClearLocal(upload.batchId)}
            disabled={busy}
          >
            Clear local
          </button>

          <button
            type="button"
            className="ghost-btn danger"
            onClick={() => onDelete?.(upload)}
            disabled={busy}
            title="Deletes this batch sales records from the server"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
