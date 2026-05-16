export default function CampaignEmptyState({ t, canCreate, onRetry, onNew }) {
  return (
    <div className="campaign-empty-state">
      <p>{t("messages.noCampaigns")}</p>

      <div className="campaign-empty-actions">
        <button type="button" className="btn-outline" onClick={onRetry}>
          {t("actions.retry")}
        </button>

        {canCreate ? (
          <button type="button" className="btn-primary" onClick={onNew}>
            {t("actions.newCampaign")}
          </button>
        ) : null}
      </div>
    </div>
  );
}