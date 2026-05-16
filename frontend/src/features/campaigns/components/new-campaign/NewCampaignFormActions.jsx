export default function NewCampaignFormActions({
  t,
  submitMode,
  createdResult,
  generating = false,
  onCancel,
  onSubmit,
}) {
  const isPublished = createdResult?.status === "active";

  return (
    <div className="campaign-form-actions">
      <button
        type="button"
        className="btn-secondary"
        onClick={onCancel}
        disabled={generating}
      >
        {t("actions.cancel")}
      </button>

      <div className="campaign-form-actions-right">
        {!isPublished ? (
          <button
            type="button"
            className="btn-outline"
            disabled={!!submitMode || generating}
            onClick={() => onSubmit("planned")}
          >
            {submitMode === "planned"
              ? t("actions.saving")
              : t("actions.saveAsPlanned")}
          </button>
        ) : null}

        <button
          type="button"
          className="btn-primary"
          disabled={!!submitMode || generating || isPublished}
          onClick={() => onSubmit("publish")}
        >
          {isPublished
            ? t("actions.published", {
                defaultValue: "Published",
              })
            : submitMode === "publish"
              ? t("actions.publishing")
              : t("actions.createAndPublish")}
        </button>
      </div>
    </div>
  );
}