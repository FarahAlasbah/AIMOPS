import { createPortal } from "react-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function DeleteSummaryModal({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
}) {
  const { t } = useTranslation("consultation");

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, isDeleting]);

  if (!open) return null;

  return createPortal(
    <div className="consultation-modal-layer">
      <button
        type="button"
        className="consultation-modal-overlay"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
        aria-label={t("close")}
      />

      <div className="consultation-modal" role="dialog" aria-modal="true">
        <div className="consultation-modal-header">
          <h3>{t("deleteSummary")}</h3>
        </div>

        <div className="consultation-modal-body">
          <p>{t("deleteSummaryConfirm")}</p>
        </div>

        <div className="consultation-modal-actions">
          <button
            type="button"
            className="consultation-secondary-button"
            onClick={onClose}
            disabled={isDeleting}
          >
            {t("cancel")}
          </button>

          <button
            type="button"
            className="consultation-secondary-button consultation-danger-button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? t("deletingSummary", { defaultValue: "Deleting..." })
              : t("deleteSummary")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}