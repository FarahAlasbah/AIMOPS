import { CAMPAIGN_TYPES } from "../../utils";

export default function NewCampaignDetailsSection({
  t,
  formData,
  errors,
  onUpdateField,
}) {
  return (
    <section className="campaign-form-section">
      <div className="section-header">
        <h3>{t("form.sections.details")}</h3>
        <p>{t("form.sections.detailsSubtitle")}</p>
      </div>

      <div className="form-grid two-columns">
        <div className="field">
          <label>{t("fields.campaignName")}</label>
          <input
            type="text"
            value={formData.campaignName}
            onChange={(e) => onUpdateField("campaignName", e.target.value)}
            placeholder={t("fields.campaignNamePlaceholder")}
          />
          {errors.campaignName ? (
            <p className="field-error">{errors.campaignName}</p>
          ) : null}
        </div>

        <div className="field">
          <label>{t("fields.budget")}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.budget}
            onChange={(e) => {
              const value = e.target.value;
              onUpdateField("budget", value === "" ? 0 : value);
            }}
            placeholder={t("fields.budgetPlaceholder")}
          />
          {errors.budget ? (
            <p className="field-error">{errors.budget}</p>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label>{t("fields.campaignType")}</label>

        <div className="campaign-type-grid">
          {CAMPAIGN_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`choice-card ${
                formData.campaignType === type ? "active" : ""
              }`}
              onClick={() => onUpdateField("campaignType", type)}
            >
              {t(`types.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {formData.campaignType === "other" ? (
        <div className="field">
          <label>{t("fields.customCampaignTypeName")}</label>
          <input
            type="text"
            value={formData.customCampaignTypeName}
            onChange={(e) =>
              onUpdateField("customCampaignTypeName", e.target.value)
            }
            placeholder={t("fields.customCampaignTypeNamePlaceholder")}
          />
          {errors.customCampaignTypeName ? (
            <p className="field-error">{errors.customCampaignTypeName}</p>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label>{t("fields.notes")}</label>
        <textarea
          rows={4}
          value={formData.notes}
          onChange={(e) => onUpdateField("notes", e.target.value)}
          placeholder={t("fields.notesPlaceholder")}
        />
      </div>
    </section>
  );
}