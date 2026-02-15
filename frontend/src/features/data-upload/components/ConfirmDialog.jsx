// frontend/src/features/data-upload/components/ConfirmDialog.jsx
import { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  busy,
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };

    document.addEventListener("keydown", onKeyDown);

    // lock scroll while open
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
      aria-label={title}
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="modal-card">
        <div className="modal-title">{title}</div>

        {message ? <div className="modal-body">{message}</div> : null}

        <div className="modal-actions">
          <button type="button" className="modal-btn" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>

          <button
            type="button"
            className="modal-btn danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
