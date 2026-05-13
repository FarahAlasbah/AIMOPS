// frontend/src/shared/components/ConfirmDialog.jsx
import { useTranslation } from "react-i18next";
import { Button } from "./index";

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText,
  cancelText,
  confirmVariant = "secondary",
  loading = false,
  disabled = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation("common");

  if (!open) return null;

  const safeTitle = title || t("shared.confirmDialog.confirm");
  const safeConfirmText = confirmText || t("shared.confirmDialog.confirm");
  const safeCancelText = cancelText || t("shared.confirmDialog.cancel");

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="modal-card" onClick={stop}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{safeTitle}</div>
            {description && <div className="modal-subtitle">{description}</div>}
          </div>

          <button
            type="button"
            className="modal-x"
            onClick={onCancel}
            aria-label={t("shared.confirmDialog.close")}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              {safeCancelText}
            </Button>

            <Button
              type="button"
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={disabled || loading}
            >
              {loading ? t("shared.confirmDialog.deleting") : safeConfirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;