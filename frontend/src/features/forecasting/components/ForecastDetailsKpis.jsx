import { useTranslation } from "react-i18next";
import {
  fmtDate,
  fmtMoney,
  getConfidenceClass,
} from "../utils/forecastDetailsUtils";

const fmtInteger = (value, locale = "en") => {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
};

export default function ForecastDetailsKpis({ selectedSummary, locale }) {
  const { t } = useTranslation("forecasting");

  return (
    <div className="forecast-details-grid">
      <div className="forecast-kpi">
        <div className="forecast-kpi-label">{t("details.summaryQuantity")}</div>
        <div className="forecast-kpi-value">
          {fmtInteger(selectedSummary.totalQuantity, locale)}
        </div>
      </div>

      <div className="forecast-kpi">
        <div className="forecast-kpi-label">{t("details.summaryAvg")}</div>
        <div className="forecast-kpi-value">
          {fmtInteger(selectedSummary.avgDailyQuantity, locale)}
        </div>
      </div>

      <div className="forecast-kpi">
        <div className="forecast-kpi-label">{t("details.summaryRevenue")}</div>
        <div className="forecast-kpi-value">
          {fmtMoney(selectedSummary.totalRevenue, locale)}
        </div>
      </div>

      <div className="forecast-kpi">
        <div className="forecast-kpi-label">{t("details.summaryPeak")}</div>
        <div className="forecast-kpi-value">
          {fmtDate(selectedSummary.peakDate, locale)}
        </div>
      </div>

      <div className="forecast-kpi">
        <div className="forecast-kpi-label">{t("details.summaryPeakQty")}</div>
        <div className="forecast-kpi-value">
          {fmtInteger(selectedSummary.peakQuantity, locale)}
        </div>
      </div>

      <div className="forecast-kpi">
        <div className="forecast-kpi-label">
          {t("details.summaryConfidence")}
        </div>
        <div className="forecast-kpi-value">
          <span
            className={`forecast-confidence-chip ${getConfidenceClass(
              selectedSummary.confidence,
            )}`}
          >
            {selectedSummary.confidence || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}