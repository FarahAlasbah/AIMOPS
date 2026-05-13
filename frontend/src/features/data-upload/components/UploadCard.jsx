// frontend/src/features/data-upload/components/UploadCard.jsx
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

const kbToMb = (kb) => {
  const n = Number(kb);
  if (Number.isNaN(n)) return "-";
  if (n >= 1024) return `${(n / 1024).toFixed(1)} MB`;
  return `${n} KB`;
};

const fmtDate = (s, language = "en") => {
  if (!s) return "-";

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";

  const locale = String(language || "").startsWith("ar") ? "ar" : "en-GB";

  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusVariant = (s) => {
  const v = String(s || "").toLowerCase();

  if (
    [
      "processed",
      "done",
      "success",
      "completed",
      "confirmed",
      "imported",
    ].includes(v)
  ) {
    return "ok";
  }

  if (
    [
      "pending",
      "mapping",
      "mapped",
      "mapping_confirmed",
      "mappings_confirmed",
      "products_pending",
      "products_ready",
      "review",
      "review_required",
    ].includes(v)
  ) {
    return "warn";
  }

  if (["failed", "error", "rejected"].includes(v)) return "err";

  return "gray";
};

const statusFallback = (status) => {
  const raw = String(status || "-").trim();
  if (!raw || raw === "-") return "-";

  return raw
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusLabel = (status, t) => {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "-";

  return t(`statuses.${value}`, {
    defaultValue: statusFallback(value),
  });
};

function StatusDot({ status }) {
  const v = statusVariant(status);
  return <span className={`ul-dot ul-dot--${v}`} />;
}

export default function UploadRow({
  upload,
  canOpenReview = false,
  isCompleted = false,
  onCompletedOpen,
  onOpenMapping,
  onReview,
  onDelete,
  deleting,
  selected = false,
  onSelectChange,
  selectionDisabled = false,
}) {
  const { t, i18n } = useTranslation("upload");

  const batchId = upload?.batchId;
  const fileName = upload?.fileName || "-";

  const handleClick = () => {
    if (deleting) return;

    if (isCompleted) {
      onCompletedOpen?.(upload);
      return;
    }

    if (canOpenReview) {
      onReview?.(batchId);
      return;
    }

    onOpenMapping?.(batchId);
  };

  const handleSelectChange = (e) => {
    e.stopPropagation();
    onSelectChange?.(batchId, e.target.checked);
  };

  return (
    <div
      className={`ul-row ${deleting ? "ul-row--busy" : ""} ${
        selected ? "ul-row--selected" : ""
      }`}
      onClick={handleClick}
      aria-selected={selected}
      title={
        isCompleted
          ? t("uploadsList.completedOpenProducts")
          : undefined
      }
    >
      <div
        className="ul-select-cell"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="ul-checkbox"
          checked={selected}
          onChange={handleSelectChange}
          disabled={selectionDisabled || deleting}
          aria-label={t("uploadsList.selectFile", { fileName })}
        />
      </div>

      <div className="ul-main">
        <div className="ul-title" title={fileName}>
          {fileName}
        </div>

        <div className="ul-sub">
          {fmtDate(upload?.uploadedAt, i18n.language)} ·{" "}
          {kbToMb(upload?.fileSizeKb)}
        </div>
      </div>

      <div className="ul-status">
        <StatusDot status={upload?.status} />
        <span>{getStatusLabel(upload?.status, t)}</span>
      </div>

      <div className="ul-actions">
        <button
          type="button"
          className="ul-btn-delete"
          disabled={deleting}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(upload);
          }}
          title={t("uploadsList.delete")}
          aria-label={t("uploadsList.deleteFile", { fileName })}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}