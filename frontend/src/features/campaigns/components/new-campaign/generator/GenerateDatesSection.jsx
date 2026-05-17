// frontend/src/features/campaigns/components/new-campaign/generator/GenerateDatesSection.jsx
import { FormCalendar } from "../../../../../shared/components";

export default function GenerateDatesSection({
  t,
  loading,
  sectionRef,
  needsTargets,
  draftStartDate,
  draftEndDate,
  onStartDateChange,
  onEndDateChange,
}) {
  return (
    <div ref={sectionRef} className="generate-campaign-modal__section">
      <div className="generate-campaign-modal__section-header">
        <div>
          <h4>{t("generator.dates.selectTitle")}</h4>
          <p>{t("generator.dates.selectSubtitle")}</p>
        </div>
      </div>

      <div className="generate-campaign-modal__date-grid">
        <FormCalendar
          label={t("fields.startDate")}
          value={draftStartDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          disabled={loading}
          required
        />

        <FormCalendar
          label={t("fields.endDate")}
          value={draftEndDate}
          min={draftStartDate || undefined}
          onChange={(event) => onEndDateChange(event.target.value)}
          disabled={loading}
          required
        />
      </div>

      {needsTargets ? (
        <div className="generate-campaign-modal__forecast-note">
          {t("generator.targets.forecastCoverageNote")}
        </div>
      ) : null}
    </div>
  );
}