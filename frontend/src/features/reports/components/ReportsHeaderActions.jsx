import { HelpCircle, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ReportsHeaderActions({ onHelp, onRefresh }) {
  const { t } = useTranslation("reports");

  return (
    <div className="reports-header-actions">
      <button
        type="button"
        className="reports-help-btn"
        onClick={onHelp}
        aria-label={t("actions.openHelp")}
        title={t("actions.howToUse")}
      >
        <HelpCircle size={18} />
      </button>

      <button
        type="button"
        className="reports-btn reports-btn-secondary"
        onClick={onRefresh}
      >
        <RefreshCcw size={16} />
        {t("actions.refresh")}
      </button>
    </div>
  );
}