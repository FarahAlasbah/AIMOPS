import { FileText, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ReportsHelpModal({ open, onClose }) {
  const { t } = useTranslation("reports");

  if (!open) return null;

  return (
    <div
      className="reports-help-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("help.ariaLabel")}
      onClick={onClose}
    >
      <div
        className="reports-help-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reports-help-header">
          <div>
            <div className="reports-help-eyebrow">{t("help.eyebrow")}</div>
            <h3>{t("help.title")}</h3>
          </div>

          <button
            type="button"
            className="reports-help-close"
            onClick={onClose}
            aria-label={t("help.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="reports-help-body">
          <div className="reports-help-item">
            <strong>{t("help.items.periodTitle")}</strong>
            <p>{t("help.items.periodText")}</p>
          </div>

          <div className="reports-help-item">
            <strong>{t("help.items.summaryTitle")}</strong>
            <p>{t("help.items.summaryText")}</p>
          </div>

          <div className="reports-help-item">
            <strong>{t("help.items.chartsTitle")}</strong>
            <p>{t("help.items.chartsText")}</p>
          </div>

          <div className="reports-help-note">
            <FileText size={17} />
            <span>{t("help.note")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}