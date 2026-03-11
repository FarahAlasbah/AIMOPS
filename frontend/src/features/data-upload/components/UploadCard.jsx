// frontend/src/features/data-upload/components/UploadCard.jsx
import { useTranslation } from "react-i18next";
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
  onOpenMapping,
  onReview,
  onClearLocal,
  onDelete,
  deleting,
}) {
  const { t } = useTranslation("upload");
  const status = upload?.status || "unknown";
  const busy = !!deleting;

  const hasConfirmedMappings = !!hasLocalMapping;

  const handlePrimaryAction = () => {
    if (hasConfirmedMappings) {
      onReview?.(upload.batchId);
      return;
    }

    onOpenMapping?.(upload.batchId);
  };

  return (
    <div className="upload-card">
      <div className="upload-card-head">
        <div className="upload-card-title-row">
          <div className="upload-card-title">
            {upload?.fileName || t("uploadCard.untitledFile")}
          </div>
          <span className={`status-pill ${statusClass(status)}`}>{fmtStatus(status)}</span>
        </div>
      </div>

      <div className="upload-kv-grid">
        <div className="upload-kv">
          <div className="upload-k">{t("uploadCard.type")}</div>
          <div className="upload-v">{upload?.fileType || "-"}</div>
        </div>

        <div className="upload-kv">
          <div className="upload-k">{t("uploadCard.size")}</div>
          <div className="upload-v">{kbToMb(upload?.fileSizeKb)}</div>
        </div>

        <div className="upload-kv">
          <div className="upload-k">{t("uploadCard.validRows")}</div>
          <div className="upload-v">{upload?.validRows ?? 0}</div>
        </div>

        <div className="upload-kv">
          <div className="upload-k">{t("uploadCard.rejectedRows")}</div>
          <div className="upload-v">{upload?.rejectedRows ?? 0}</div>
        </div>
      </div>

      <div className="upload-flags">
        <span className={`chip ${hasLocalMapping ? "good" : "warn"}`}>
          {hasLocalMapping ? t("uploadCard.mappingsSaved") : t("uploadCard.mappingsNotSaved")}
        </span>

        <span className={`chip ${hasCachedAnalysis ? "good" : ""}`}>
          {hasCachedAnalysis ? t("uploadCard.analysisCached") : t("uploadCard.analysisNotCached")}
        </span>
      </div>

      <div className="upload-actions-row">
        <div className="upload-actions-main">
          <Button variant="primary" onClick={handlePrimaryAction} disabled={busy}>
            {busy
              ? t("uploadCard.deleting")
              : hasConfirmedMappings
              ? t("uploadCard.products")
              : t("uploadCard.continueMapping", { defaultValue: "Continue mapping" })}
          </Button>
        </div>

        <div className="upload-actions-aux">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onClearLocal(upload.batchId)}
            disabled={busy}
          >
            {t("uploadCard.clearLocal")}
          </button>

          <button
            type="button"
            className="ghost-btn danger"
            onClick={() => onDelete?.(upload)}
            disabled={busy}
            title={t("uploadCard.deleteTitle")}
          >
            {t("uploadCard.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}