import { useEffect } from "react";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      className="ev-confirm-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="ev-confirm-modal">
        <div className="ev-confirm-icon">!</div>

        <div className="ev-confirm-title">{title}</div>
        <div className="ev-confirm-message">{message}</div>

        <div className="ev-confirm-actions">
          <button
            type="button"
            className="ev-confirm-cancel-btn"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="ev-confirm-primary-btn"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}