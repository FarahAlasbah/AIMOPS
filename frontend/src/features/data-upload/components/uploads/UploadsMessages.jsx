// frontend/src/features/data-upload/components/uploads/UploadsMessages.jsx
import { AlertTriangle } from "lucide-react";
import InfoMessage from "../../../../shared/components/InfoMessage";

export default function UploadsMessages({
  t,
  error,
  warning,
  onDismissWarning,
}) {
  return (
    <>
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <InfoMessage type="error">{error}</InfoMessage>
        </div>
      ) : null}

      {warning ? (
        <div className="uploads-warning-banner-wrap">
          <div className="uploads-warning-banner" role="alert">
            <div className="uploads-warning-banner__icon">
              <AlertTriangle size={18} />
            </div>

            <div className="uploads-warning-banner__content">
              <div className="uploads-warning-banner__title">
                {t("uploadsPage.warningTitle", {
                  defaultValue: "This file was already uploaded",
                })}
              </div>

              <div className="uploads-warning-banner__text">{warning}</div>
            </div>

            <div className="uploads-warning-banner__actions">
              <button
                type="button"
                className="uploads-warning-banner__dismiss"
                onClick={onDismissWarning}
              >
                {t("uploadsPage.dismiss")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}