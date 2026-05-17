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
  const optionalLabel = t("common.optional", {
    defaultValue: "optional",
  });

  return (
    <div ref={sectionRef} className="generate-campaign-modal__section">
      <div className="generate-campaign-modal__section-header">
        <div>
          <h4>{t("generator.dates.selectTitle")}</h4>

          <p>
            {t("generator.dates.selectSubtitle", {
              defaultValue:
                "Choose dates only if you already know them. Otherwise, leave them empty and AIMOPS will suggest them.",
            })}
          </p>
        </div>
      </div>

      <div className="generate-campaign-modal__date-grid">
        <FormCalendar
          label={`${t("fields.startDate")} (${optionalLabel})`}
          value={draftStartDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          disabled={loading}
        />

        <FormCalendar
          label={`${t("fields.endDate")} (${optionalLabel})`}
          value={draftEndDate}
          min={draftStartDate || undefined}
          onChange={(event) => onEndDateChange(event.target.value)}
          disabled={loading}
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