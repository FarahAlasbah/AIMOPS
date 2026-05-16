import { FormCalendar } from "../../../../shared/components";

export default function NewCampaignScheduleSection({
  t,
  formData,
  errors,
  onUpdateField,
}) {
  return (
    <section className="campaign-form-section">
      <div className="section-header">
        <h3>{t("form.sections.schedule")}</h3>
        <p>{t("form.sections.scheduleSubtitle")}</p>
      </div>

      <div className="form-grid two-columns">
        <FormCalendar
          label={t("fields.startDate")}
          value={formData.startDate}
          onChange={(e) => onUpdateField("startDate", e.target.value)}
          required
          error={errors.startDate}
        />

        <FormCalendar
          label={t("fields.endDate")}
          value={formData.endDate}
          onChange={(e) => onUpdateField("endDate", e.target.value)}
          min={formData.startDate || undefined}
          required
          error={errors.endDate}
        />
      </div>
    </section>
  );
}