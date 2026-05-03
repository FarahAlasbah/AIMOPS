// frontend/src/features/consultation/components/ConsultationHeader.jsx
import { Expand, Shrink, Trash2, FileText, ExternalLink, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConsultation } from "../hooks/useConsultation";

export default function ConsultationHeader({
  mode = "page",
  onClearRequest,
  onSaveSummaryRequest,
}) {
  const { t } = useTranslation("consultation");
  const navigate = useNavigate();
  const { isDrawerExpanded, toggleDrawerExpanded, closeDrawer } =
    useConsultation();

  const isDrawer = mode === "drawer";

  return (
    <div className="consultation-header">
      <div className="consultation-header-copy">
        <h2 className="consultation-title">{t("title")}</h2>
        <p className="consultation-subtitle">{t("subtitle")}</p>
      </div>

      <div className="consultation-header-actions">
        <button
          type="button"
          className={isDrawer ? "consultation-icon-button" : "consultation-text-button"}
          onClick={onSaveSummaryRequest}
          aria-label={t("saveSummary")}
          title={t("saveSummary")}
        >
          {isDrawer ? <FileText size={18} /> : t("saveSummary")}
        </button>

        <button
          type="button"
          className="consultation-icon-button"
          onClick={onClearRequest}
          aria-label={t("clear")}
          title={t("clear")}
        >
          <Trash2 size={18} />
        </button>

        {isDrawer ? (
          <>
            <button
              type="button"
              className="consultation-icon-button"
              onClick={toggleDrawerExpanded}
              aria-label={isDrawerExpanded ? t("collapse") : t("expand")}
              title={isDrawerExpanded ? t("collapse") : t("expand")}
            >
              {isDrawerExpanded ? <Shrink size={18} /> : <Expand size={18} />}
            </button>

            <button
              type="button"
              className="consultation-icon-button"
              onClick={() => {
                navigate("/app/consultation");
                closeDrawer();
              }}
              aria-label={t("openPage")}
              title={t("openPage")}
            >
              <ExternalLink size={18} />
            </button>

            <button
              type="button"
              className="consultation-icon-button consultation-close-button"
              onClick={closeDrawer}
              aria-label={t("close")}
              title={t("close")}
            >
              <X size={18} />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}