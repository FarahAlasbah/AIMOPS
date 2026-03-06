// frontend/src/features/data-upload/components/ConfirmDialog.jsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function ConfirmDialog({
  open,
  title,
  message = "",
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  busy,
}) {
  const { t } = useTranslation("upload");

  const finalTitle = title || t("confirmDialog.title");
  const finalConfirmText = confirmText || t("confirmDialog.confirm");
  const finalCancelText = cancelText || t("confirmDialog.cancel");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };

    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={finalTitle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="modal-card">
        <div className="modal-title">{finalTitle}</div>

        {message ? <div className="modal-body">{message}</div> : null}

        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn"
            onClick={onCancel}
            disabled={busy}
          >
            {finalCancelText}
          </button>

          <button
            type="button"
            className="modal-btn danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy
              ? t("confirmDialog.deleting")
              : finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}