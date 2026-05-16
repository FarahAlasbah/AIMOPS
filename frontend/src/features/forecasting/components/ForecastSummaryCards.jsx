import { useTranslation } from "react-i18next";
import { fmtNumber } from "../utils/forecastingUtils";

export default function ForecastSummaryCards({ summary, locale }) {
  const { t } = useTranslation("forecasting");

  return (
    <div className="forecast-summary-row">
      <div className="forecast-summary-card">
        <div className="forecast-summary-label">{t("summary.total")}</div>
        <div className="forecast-summary-value">
          {fmtNumber(summary.total_products, locale)}
        </div>
      </div>

      <div className="forecast-summary-card">
        <div className="forecast-summary-label">{t("summary.ready")}</div>
        <div className="forecast-summary-value">
          {fmtNumber(summary.ready, locale)}
        </div>
      </div>

      <div className="forecast-summary-card">
        <div className="forecast-summary-label">{t("summary.training")}</div>
        <div className="forecast-summary-value">
          {fmtNumber(summary.training, locale)}
        </div>
      </div>

      <div className="forecast-summary-card">
        <div className="forecast-summary-label">{t("summary.failed")}</div>
        <div className="forecast-summary-value">
          {fmtNumber(summary.failed, locale)}
        </div>
      </div>
    </div>
  );
}