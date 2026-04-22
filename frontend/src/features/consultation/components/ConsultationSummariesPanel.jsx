import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useConsultation } from "../hooks/useConsultation";
import ConsultationSummaryCard from "./ConsultationSummaryCard";

export default function ConsultationSummariesPanel() {
  const { t } = useTranslation("consultation");
  const {
    summaries,
    isSummariesLoading,
    summariesError,
    ensureSummariesLoaded,
    deleteSummary,
  } = useConsultation();

  useEffect(() => {
    ensureSummariesLoaded();
  }, [ensureSummariesLoaded]);

  return (
    <aside className="consultation-summaries-panel">
      <div className="consultation-summaries-header">
        <div>
          <h3>{t("summariesTitle")}</h3>
          <p>
            {t("summariesSubtitle", {
              defaultValue: "Quick notes saved from past chats.",
            })}
          </p>
        </div>
      </div>

      <div className="consultation-summaries-body">
        {isSummariesLoading ? (
          <div className="consultation-inline-state">
            {t("loading", { defaultValue: "Loading..." })}
          </div>
        ) : summariesError ? (
          <div className="consultation-inline-state consultation-inline-state-error">
            <p>{summariesError}</p>
            <button
              type="button"
              className="consultation-ghost-button"
              onClick={() => ensureSummariesLoaded({ force: true })}
            >
              {t("retry", { defaultValue: "Retry" })}
            </button>
          </div>
        ) : summaries.length === 0 ? (
          <div className="consultation-summaries-empty">
            <p>{t("summariesEmpty")}</p>
          </div>
        ) : (
          <div className="consultation-summaries-list">
            {summaries.map((summary) => (
              <ConsultationSummaryCard
                key={summary.summary_id}
                summary={summary}
                onDelete={deleteSummary}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}