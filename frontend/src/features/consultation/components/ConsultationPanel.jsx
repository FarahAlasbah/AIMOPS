import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConsultation } from "../hooks/useConsultation";
import ConsultationHeader from "./ConsultationHeader";
import ConsultationMessageList from "./ConsultationMessageList";
import ConsultationComposer from "./ConsultationComposer";
import ConsultationEmptyState from "./ConsultationEmptyState";
import ClearConsultationModal from "./ClearConsultationModal";
import SaveSummaryModal from "./SaveSummaryModal";

export default function ConsultationPanel({ mode = "page" }) {
  const { t } = useTranslation("consultation");
  const {
    messages,
    isHistoryLoading,
    historyError,
    ensureHistoryLoaded,
    notice,
    clearNotice,
  } = useConsultation();

  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [saveSummaryModalOpen, setSaveSummaryModalOpen] = useState(false);

  useEffect(() => {
    ensureHistoryLoaded();
  }, [ensureHistoryLoaded]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => {
      clearNotice();
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [notice, clearNotice]);

  return (
    <section className={`consultation-shell consultation-panel consultation-panel-${mode}`}>
      <ConsultationHeader
        mode={mode}
        onClearRequest={() => setClearModalOpen(true)}
        onSaveSummaryRequest={() => setSaveSummaryModalOpen(true)}
      />

      {notice ? (
        <div
          className={`consultation-banner consultation-banner-${notice.type || "info"}`}
          role="status"
        >
          {notice.text}
        </div>
      ) : null}

      <div className="consultation-body">
        {isHistoryLoading && messages.length === 0 ? (
          <div className="consultation-inline-state">{t("historyLoading")}</div>
        ) : historyError && messages.length === 0 ? (
          <div className="consultation-inline-state consultation-inline-state-error">
            <p>{historyError}</p>
            <button
              type="button"
              className="consultation-ghost-button"
              onClick={() => ensureHistoryLoaded({ force: true })}
            >
              {t("retry", { defaultValue: "Retry" })}
            </button>
          </div>
        ) : messages.length === 0 ? (
          <ConsultationEmptyState />
        ) : (
          <ConsultationMessageList messages={messages} />
        )}
      </div>

      <div className="consultation-composer-wrap">
        <ConsultationComposer />
      </div>

      <ClearConsultationModal
        open={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
      />

      <SaveSummaryModal
        open={saveSummaryModalOpen}
        onClose={() => setSaveSummaryModalOpen(false)}
      />
    </section>
  );
}