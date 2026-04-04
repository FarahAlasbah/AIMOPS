import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./ConfirmActionModal.css";

const ConfirmActionModal = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  isLoading = false,
}) => {
  const { t } = useTranslation("campaigns");

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-action-modal__overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        className="confirm-action-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-modal-title"
      >
        <div className="confirm-action-modal__header">
          <h3 id="confirm-action-modal-title">{title}</h3>
          <p>{message}</p>
        </div>

        <div className="confirm-action-modal__footer">
          <button
            type="button"
            className="confirm-action-modal__button confirm-action-modal__button--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {t("actions.cancel")}
          </button>

          <button
            type="button"
            className={`confirm-action-modal__button ${
              confirmVariant === "danger"
                ? "confirm-action-modal__button--danger"
                : "confirm-action-modal__button--primary"
            }`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;