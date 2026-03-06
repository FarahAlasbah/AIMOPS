// frontend/src/shared/components/ConfirmDialog.jsx
import { useTranslation } from "react-i18next";
import { Button } from './index';

const ConfirmDialog = ({
  open,
  title = 'Confirm',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'secondary',
  loading = false,
  disabled = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation("common");

  if (!open) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-card" onClick={stop}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            {description && <div className="modal-subtitle">{description}</div>}
          </div>

          <button type="button" className="modal-x" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              {cancelText}
            </Button>

            <Button
              type="button"
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={disabled || loading}
            >
              {loading ? t("shared.confirmDialog.deleting") : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;