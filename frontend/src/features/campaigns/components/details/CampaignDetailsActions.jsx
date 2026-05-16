export default function CampaignDetailsActions({
  t,
  campaign,
  canUpdate,
  canDelete,
  busyAction,
  onBack,
  onConfirm,
}) {
  return (
    <div className="campaign-details-actions">
      <button type="button" className="btn-outline" onClick={onBack}>
        {t("actions.backToCampaigns")}
      </button>

      {canUpdate && campaign?.status === "planned" ? (
        <button
          type="button"
          className="btn-primary"
          disabled={busyAction === "publish"}
          onClick={() => onConfirm("publish")}
        >
          {busyAction === "publish"
            ? t("actions.publishing")
            : t("actions.publish")}
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          className="btn-danger"
          disabled={busyAction === "delete"}
          onClick={() => onConfirm("delete")}
        >
          {busyAction === "delete"
            ? t("actions.deleting")
            : t("actions.delete")}
        </button>
      ) : null}
    </div>
  );
}