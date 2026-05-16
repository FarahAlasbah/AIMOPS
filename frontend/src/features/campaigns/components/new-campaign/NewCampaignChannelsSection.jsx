import { CHANNEL_OPTIONS } from "../../utils";

export default function NewCampaignChannelsSection({
  t,
  formData,
  errors,
  onToggleChannel,
}) {
  return (
    <section className="campaign-form-section">
      <div className="section-header">
        <h3>{t("form.sections.channels")}</h3>
        <p>{t("form.sections.channelsSubtitle")}</p>
      </div>

      <div className="channels-wrap">
        {CHANNEL_OPTIONS.map((channel) => {
          const selected = formData.channels.includes(channel);

          return (
            <button
              key={channel}
              type="button"
              className={`channel-chip ${selected ? "active" : ""}`}
              onClick={() => onToggleChannel(channel)}
            >
              {t(`channels.${channel}`)}
            </button>
          );
        })}
      </div>

      {errors.channels ? (
        <p className="field-error">{errors.channels}</p>
      ) : null}
    </section>
  );
}