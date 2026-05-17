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

export default function SaveSummaryModal({ open, onClose }) {
  const { t } = useTranslation("consultation");
  const { saveSummary, isCreatingSummary } = useConsultation();

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
      if (event.key === "Escape" && !isCreatingSummary) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreatingSummary, onClose, open]);

  if (!open) return null;

  const handleSave = async () => {
    const ok = await saveSummary(summaryTitle);
    if (ok) onClose();
  };

  return createPortal(
    <div className="consultation-modal-layer">
      <button
        type="button"
        className="consultation-modal-overlay"
        onClick={() => {
          if (!isCreatingSummary) onClose();
        }}
        aria-label={t("close")}
      />

      <div className="consultation-modal" role="dialog" aria-modal="true">
        <div className="consultation-modal-header">
          <h3>{t("saveSummary")}</h3>
        </div>

        <div className="consultation-modal-body">
          {isCreatingSummary ? (
            <SavingSummarySkeleton
              label={t("savingSummary", {
                defaultValue: "Saving summary...",
              })}
            />
          ) : (
            <>
              <label
                className="consultation-field-label"
                htmlFor="consultation-save-summary-title"
              >
                {t("summaryTitle")}
              </label>

              <input
                id="consultation-save-summary-title"
                type="text"
                className="consultation-input"
                value={summaryTitle}
                onChange={(event) => setSummaryTitle(event.target.value)}
                disabled={isCreatingSummary}
              />
            </>
          )}
        </div>

        <div className="consultation-modal-actions">
          <button
            type="button"
            className="consultation-secondary-button"
            onClick={onClose}
            disabled={isCreatingSummary}
          >
            {t("cancel")}
          </button>

          <button
            type="button"
            className="consultation-primary-button"
            onClick={handleSave}
            disabled={isCreatingSummary}
          >
            {isCreatingSummary
              ? t("savingSummary", { defaultValue: "Saving..." })
              : t("saveSummary")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}