import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { buildConsultationSummaryTitle } from "../utils/consultationHelpers";
import { useConsultation } from "../hooks/useConsultation";

function SavingSummarySkeleton({ label }) {
  return (
    <div className="consultation-summary-save-skeleton" aria-live="polite">
      <div className="consultation-summary-save-spinner" />

      <div className="consultation-summary-save-copy">
        <strong>{label}</strong>

        <div className="consultation-summary-save-lines">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default function ClearConsultationModal({ open, onClose }) {
  const { t } = useTranslation("consultation");
  const { clearConversation, isCreatingSummary, isClearing } = useConsultation();

  const defaultTitle = useMemo(
    () => buildConsultationSummaryTitle(t("summaryDefaultTitle")),
    [t],
  );

  const [summaryTitle, setSummaryTitle] = useState(defaultTitle);

  useEffect(() => {
    if (!open) return;
    setSummaryTitle(buildConsultationSummaryTitle(t("summaryDefaultTitle")));
  }, [open, t]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isCreatingSummary && !isClearing) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isClearing, isCreatingSummary, onClose, open]);

  if (!open) return null;

  const isBusy = isCreatingSummary || isClearing;

  const handleDeleteWithoutSummary = async () => {
    const ok = await clearConversation({ shouldCreateSummary: false });
    if (ok) onClose();
  };

  const handleSaveSummaryAndDelete = async () => {
    const ok = await clearConversation({
      shouldCreateSummary: true,
      summaryTitle,
    });

    if (ok) onClose();
  };

  return createPortal(
    <div className="consultation-modal-layer">
      <button
        type="button"
        className="consultation-modal-overlay"
        onClick={() => {
          if (!isBusy) onClose();
        }}
        aria-label={t("close")}
      />

      <div className="consultation-modal" role="dialog" aria-modal="true">
        <div className="consultation-modal-header">
          <h3>{t("clearTitle")}</h3>
        </div>

        <div className="consultation-modal-body">
          {isCreatingSummary ? (
            <SavingSummarySkeleton
              label={t("savingSummary", {
                defaultValue: "Saving summary...",
              })}
            />
          ) : isClearing ? (
            <SavingSummarySkeleton
              label={t("clearingConversation", {
                defaultValue: "Clearing conversation...",
              })}
            />
          ) : (
            <>
              <p>{t("clearDescription")}</p>

              <label
                className="consultation-field-label"
                htmlFor="consultation-summary-title"
              >
                {t("summaryTitle")}
              </label>

              <input
                id="consultation-summary-title"
                type="text"
                className="consultation-input"
                value={summaryTitle}
                onChange={(event) => setSummaryTitle(event.target.value)}
                disabled={isBusy}
              />
            </>
          )}
        </div>

        <div className="consultation-modal-actions">
          <button
            type="button"
            className="consultation-secondary-button"
            onClick={onClose}
            disabled={isBusy}
          >
            {t("cancel")}
          </button>

          <button
            type="button"
            className="consultation-secondary-button consultation-danger-button"
            onClick={handleDeleteWithoutSummary}
            disabled={isBusy}
          >
            {t("deleteWithoutSummary")}
          </button>

          <button
            type="button"
            className="consultation-primary-button"
            onClick={handleSaveSummaryAndDelete}
            disabled={isBusy}
          >
            {isCreatingSummary
              ? t("savingSummary", { defaultValue: "Saving..." })
              : t("saveSummaryAndDelete")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}