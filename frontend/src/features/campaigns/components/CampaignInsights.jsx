import { useTranslation } from "react-i18next";
import { formatCurrency, formatNumber, formatPercent } from "../utils";
import "./CampaignInsights.css";

const CampaignInsights = ({ result }) => {
  const { t } = useTranslation("campaigns");

  if (!result) return null;

  const dateSuggestions =
    Array.isArray(result.date_suggestions) && result.date_suggestions.length
      ? result.date_suggestions
      : result.start_date && result.end_date
      ? [
          {
            label: t("insights.yourProposedDates", {
              defaultValue: "Your proposed dates",
            }),
            start_date: result.start_date,
            end_date: result.end_date,
            forecast_quantity: result.forecast_quantity ?? null,
            forecast_uplift_pct: result.forecast_uplift_pct ?? null,
            note: t("insights.noForecastData", {
              defaultValue:
                "No forecast data available — generate forecasts first",
            }),
          },
        ]
      : [];

  const forecastImpact =
    result.forecast_impact ||
    (dateSuggestions.length
      ? {
          confidence: result.forecast_confidence || "medium",
          multiplier_source: result.multiplier_source || "default",
          totals: {
            additional_units: result.forecast_additional_units ?? 0,
            base_revenue: result.forecast_base_revenue ?? null,
            additional_revenue: result.forecast_additional_revenue ?? null,
            estimated_roi: result.predicted_roi ?? null,
          },
          products: [],
        }
      : null);

  return (
    <div className="campaign-insights-stack">
{dateSuggestions.length ? (
          <div className="campaign-insights-card">
          <div className="campaign-insights-header">
            <h3>{t("insights.dateSuggestions")}</h3>
            {/* <p>{t("insights.dateSuggestionsSubtitle")}</p> */}
          </div>

          <div className="campaign-suggestions-grid">
            {dateSuggestions.map((item, index) => (
              <div key={`${item.label}-${index}`} className="campaign-suggestion-card">
                <h4>{item.label}</h4>
                <p>
                  {item.start_date} → {item.end_date}
                </p>

                <div className="campaign-suggestion-stats">
                  <span>
                    {t("insights.forecastQuantity")}:
                    <strong> {formatNumber(item.forecast_quantity)}</strong>
                  </span>
                  <span>
                    {t("insights.uplift")}:
                    <strong> {formatPercent(item.forecast_uplift_pct)}</strong>
                  </span>
                </div>

                <p className="campaign-suggestion-note">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {forecastImpact ? (
        <div className="campaign-insights-card">
          <div className="campaign-insights-header">
            <h3>{t("insights.forecastImpact")}</h3>
            <p>
              {t("insights.confidence")}: {forecastImpact.confidence} ·{" "}
              {t("insights.source")}: {forecastImpact.multiplier_source}
            </p>
          </div>

          <div className="campaign-insights-stats">
            <div className="campaign-stat-card">
              <span>{t("insights.additionalUnits")}</span>
              <strong>
                {formatNumber(forecastImpact.totals?.additional_units)}
              </strong>
            </div>

            <div className="campaign-stat-card">
              <span>{t("insights.baseRevenue")}</span>
              <strong>
                {formatCurrency(forecastImpact.totals?.base_revenue)}
              </strong>
            </div>

            <div className="campaign-stat-card">
              <span>{t("insights.additionalRevenue")}</span>
              <strong>
                {formatCurrency(forecastImpact.totals?.additional_revenue)}
              </strong>
            </div>

            <div className="campaign-stat-card">
              <span>{t("insights.estimatedRoi")}</span>
              <strong>{forecastImpact.totals?.estimated_roi ?? "-"}</strong>
            </div>
          </div>

          <div className="campaign-impact-products">
            {forecastImpact.products?.map((product) => (
              <div key={product.product_id} className="campaign-impact-product">
                <div className="campaign-impact-product-top">
                  <div>
                    <h4>{product.product_name}</h4>
                    <p>{product.category}</p>
                  </div>

                  <span className="campaign-impact-pill">
                    {formatPercent(product.expected_uplift_pct)}
                  </span>
                </div>

                <div className="campaign-impact-grid">
                  <div>
                    <span>{t("insights.baseQuantity")}</span>
                    <strong>{formatNumber(product.base_quantity)}</strong>
                  </div>

                  <div>
                    <span>{t("insights.adjustedQuantity")}</span>
                    <strong>{formatNumber(product.adjusted_quantity)}</strong>
                  </div>

                  <div>
                    <span>{t("insights.additionalUnits")}</span>
                    <strong>{formatNumber(product.additional_units)}</strong>
                  </div>

                  <div>
                    <span>{t("insights.additionalRevenue")}</span>
                    <strong>{formatCurrency(product.additional_revenue)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result.consultation ? (
        <div className="campaign-insights-card">
          <div className="campaign-insights-header">
            <h3>{t("insights.businessAdvice")}</h3>
            <p>
              {t("insights.risk")}: {result.consultation.risk_level} ·{" "}
              {t("insights.confidence")}: {result.consultation.confidence}
            </p>
          </div>

          <div className="campaign-advice-box">
            <p>{result.consultation.advice}</p>

            {result.consultation.recommendations?.length ? (
              <ul>
                {result.consultation.recommendations.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CampaignInsights;