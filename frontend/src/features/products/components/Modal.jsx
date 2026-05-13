// frontend/src/features/products/components/Modal.jsx
import { useTranslation } from "react-i18next";

export default function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  style,
}) {
  const { t } = useTranslation("products");

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card" style={style}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>

          <button
            className="modal-x"
            onClick={onClose}
            aria-label={t("modal.close")}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="modal-body">{children}</div>

        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}