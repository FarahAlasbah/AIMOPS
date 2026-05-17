// frontend/src/features/campaigns/components/new-campaign/generator/GenerateModalFooter.jsx

function GenerateMiniLoader({ t }) {
  return (
    <div className="generate-campaign-modal__mini-loader" aria-live="polite">
      <span className="generate-campaign-modal__spinner" />

      <span>{t("generator.loadingShort")}</span>
    </div>
  );
}

export default function GenerateModalFooter({
  t,
  loading,
  canGenerate,
  onClose,
  onSubmit,
}) {
  return (
    <div className="generate-campaign-modal__footer">
      <div className="generate-campaign-modal__footer-status">
        {loading ? <GenerateMiniLoader t={t} /> : null}
      </div>

      <div className="generate-campaign-modal__footer-actions">
        <button
          type="button"
          className="generate-campaign-modal__button generate-campaign-modal__button--secondary"
          onClick={onClose}
          disabled={loading}
        >
          {t("actions.cancel")}
        </button>

        <button
          type="button"
          className="generate-campaign-modal__button generate-campaign-modal__button--primary"
          onClick={onSubmit}
          disabled={!canGenerate}
        >
          {loading ? t("actions.generating") : t("actions.generate")}
        </button>
      </div>
    </div>
  );
}