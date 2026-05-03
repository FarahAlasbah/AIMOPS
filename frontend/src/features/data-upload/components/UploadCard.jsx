import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

const kbToMb = (kb) => {
  const n = Number(kb);
  if (Number.isNaN(n)) return "-";
  if (n >= 1024) return `${(n / 1024).toFixed(1)} MB`;
  return `${n} KB`;
};

const fmtDate = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusVariant = (s) => {
  const v = String(s || "").toLowerCase();
  if (["processed", "done", "success"].includes(v)) return "ok";
  if (["pending", "mapping"].includes(v)) return "warn";
  if (["failed", "error", "rejected"].includes(v)) return "err";
  return "gray";
};

function StatusDot({ status }) {
  const v = statusVariant(status);
  return <span className={`ul-dot ul-dot--${v}`} />;
}

export default function UploadRow({
  upload,
  hasLocalMapping,
  onOpenMapping,
  onReview,
  onDelete,
  deleting,
  selected = false,
  onSelectChange,
  selectionDisabled = false,
}) {
  const { t } = useTranslation("upload");

  const batchId = upload?.batchId;
  const fileName = upload?.fileName || "-";

  const handleClick = () => {
    if (deleting) return;

    if (hasLocalMapping) {
      onReview?.(batchId);
    } else {
      onOpenMapping?.(batchId);
    }
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
          aria-label={t("uploadsList.selectFile", {
            fileName,
            defaultValue: `Select ${fileName}`,
          })}
        />
      </div>

      <div className="ul-main">
        <div className="ul-title" title={fileName}>
          {fileName}
        </div>
        <div className="ul-sub">
          {fmtDate(upload?.uploadedAt)} · {kbToMb(upload?.fileSizeKb)}
        </div>
      </div>

      <div className="ul-status">
        <StatusDot status={upload?.status} />
        <span style={{ textTransform: "capitalize" }}>
          {upload?.status || "-"}
        </span>
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
          title={t("uploadsList.delete", { defaultValue: "Delete" })}
          aria-label={t("uploadsList.deleteFile", {
            fileName,
            defaultValue: `Delete ${fileName}`,
          })}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}