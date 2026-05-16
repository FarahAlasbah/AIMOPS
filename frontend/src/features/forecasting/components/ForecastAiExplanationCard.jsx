import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components";
import { fmtDateTime } from "../utils/forecastDetailsUtils";

export default function ForecastAiExplanationCard({
  locale,
  hasFetchedExplanation,
  hasExplanation,
  explanationLoading,
  explanationText,
  explanationDrivers,
  explanationData,
  explanationErr,
  isExplanationStale,
  onExplain,
  onReExplain,
}) {
  const { t } = useTranslation("forecasting");

  return (
    <div className="forecast-explanation">
      <div className="forecast-explanation-head">
        <div className="forecast-explanation-title">
          {t("details.aiExplanation.title")}
        </div>

        {!hasFetchedExplanation ? (
          <Button type="button" onClick={onExplain} disabled={explanationLoading}>
            {explanationLoading
              ? t("details.aiExplanation.generating")
              : t("details.aiExplanation.explain")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={onReExplain}
            disabled={explanationLoading}
          >
            {explanationLoading
              ? t("details.aiExplanation.regenerating")
              : t("details.aiExplanation.reExplain")}
          </Button>
        )}
      </div>

      {!hasFetchedExplanation && !explanationLoading ? (
        <div className="forecast-explanation-text">
          {t("details.aiExplanation.requestOnly")}
        </div>
      ) : null}

      {explanationLoading ? (
        <div className="forecast-explanation-text">
          {t("details.aiExplanation.generatingText")}
        </div>
      ) : null}

      {hasFetchedExplanation && hasExplanation ? (
        <div className="forecast-ai-body">
          {isExplanationStale ? (
            <div className="forecast-ai-stale">
              {t("details.aiExplanation.stale")}
            </div>
          ) : null}

          <div className="forecast-ai-summary">{explanationText}</div>

          {explanationDrivers.length > 0 ? (
            <div className="forecast-ai-drivers-card">
              <div className="forecast-drivers-title">
                {t("details.aiExplanation.keyDrivers")}
              </div>

              <div className="forecast-ai-drivers">
                {explanationDrivers.map((driver, index) => (
                  <div className="forecast-ai-driver" key={`${driver}-${index}`}>
                    <span className="forecast-ai-driver-dot" />
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasFetchedExplanation && explanationData?.generated_at ? (
        <div className="forecast-note" style={{ marginTop: 10 }}>
          {t("details.aiExplanation.generatedAt", {
            date: fmtDateTime(explanationData.generated_at, locale),
          })}
          {explanationData?.cached
            ? ` • ${t("details.aiExplanation.cached")}`
            : ""}
        </div>
      ) : null}

      {hasFetchedExplanation && explanationErr ? (
        <div className="forecast-note" style={{ marginTop: 10 }}>
          {t("details.aiExplanation.error")}
        </div>
      ) : null}
    </div>
  );
}