import ReactApexChart from "react-apexcharts";
import { useTranslation } from "react-i18next";
import { Card, FormSelect } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import { fmtDate } from "../utils/forecastDetailsUtils";

export default function ForecastAnalyticsCard({
  locale,
  forecastStart,
  forecastEnd,
  safeEndDate,
  windowPreset,
  selectedSummary,
  noForecastInRange,
  weeklyBuckets,
  dailySeries,
  dailyChartOptions,
  weeklyChartSeries,
  weeklyChartOptions,
  onPresetChange,
}) {
  const { t } = useTranslation("forecasting");

  return (
    <Card className="forecast-details-card forecast-analytics-card">
      <div className="forecast-period-block">
        <div className="forecast-period-label">{t("details.metaPeriod")}</div>

        <div className="forecast-period-value">
          {fmtDate(forecastStart, locale)}
          <span>→</span>
          {fmtDate(forecastEnd, locale)}
        </div>
      </div>

      <div
        className={[
          "forecast-window-panel",
          selectedSummary.hasEventBoosts ? "has-boosts" : "",
        ].join(" ")}
      >
        <div className="forecast-window-select">
          <FormSelect
            label={t("details.visibleWindowLabel")}
            options={[
              { value: "14", label: t("details.days14") },
              { value: "21", label: t("details.days21") },
              { value: "30", label: t("details.days30") },
              { value: "60", label: t("details.days60") },
              { value: "90", label: t("details.days90") },
            ]}
            value={windowPreset}
            onChange={onPresetChange}
          />
        </div>

        <div className="forecast-selected-range">
          <div className="forecast-selected-range-label">
            {t("details.selectedRange")}
          </div>

          <div className="forecast-selected-range-value">
            <span>{fmtDate(forecastStart, locale)}</span>
            <span className="forecast-selected-range-arrow">→</span>
            <span>{fmtDate(safeEndDate, locale)}</span>
          </div>
        </div>

        {selectedSummary.hasEventBoosts ? (
          <div className="forecast-window-boost">
            <span className="forecast-badge accent">
              {t("details.eventBoostsActive")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="forecast-chart-warning">
        <InfoMessage type="warning">{t("details.chartWarning")}</InfoMessage>
      </div>

      <div className="forecast-chart-grid">
        <div className="forecast-chart-card">
          <div className="forecast-chart-title">{t("details.dailyTitle")}</div>
          <div className="forecast-chart-subtitle">
            {t("details.dailySubtitle")}
          </div>

          <div className="forecast-chart-box">
            {noForecastInRange ? (
              <InfoMessage type="warning">
                {t("details.selectionEmpty")}
              </InfoMessage>
            ) : (
              <ReactApexChart
                type="line"
                height={360}
                series={dailySeries}
                options={dailyChartOptions}
              />
            )}
          </div>
        </div>

        <div className="forecast-chart-card">
          <div className="forecast-chart-title">{t("details.weeklyTitle")}</div>
          <div className="forecast-chart-subtitle">
            {t("details.weeklySubtitle")}
          </div>

          <div className="forecast-chart-box small">
            {weeklyBuckets.length === 0 ? (
              <InfoMessage type="info">
                {t("details.selectionEmpty")}
              </InfoMessage>
            ) : (
              <ReactApexChart
                type="line"
                height={300}
                series={weeklyChartSeries}
                options={weeklyChartOptions}
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}