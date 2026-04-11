import { useTranslation } from "react-i18next";
import { formatCurrency, formatNumber, formatPercent } from "../utils";
import "./CampaignInsights.css";

const CampaignInsights = ({ result }) => {
  const { t } = useTranslation("campaigns");

  if (!result) return null;

  return (
    <div className="campaign-insights-stack">
      {result.date_suggestions?.length ? (
        <div className="campaign-insights-card">
          <div className="campaign-insights-header">
            <h3>{t("insights.dateSuggestions")}</h3>
            {/* <p>{t("insights.dateSuggestionsSubtitle")}</p> */}
          </div>

          <div className="campaign-suggestions-grid">
            {result.date_suggestions.map((item, index) => (
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

      {result.forecast_impact ? (
        <div className="campaign-insights-card">
          <div className="campaign-insights-header">
            <h3>{t("insights.forecastImpact")}</h3>
            <p>
              {t("insights.confidence")}: {result.forecast_impact.confidence} ·{" "}
              {t("insights.source")}: {result.forecast_impact.multiplier_source}
            </p>
          </div>

          <div className="campaign-insights-stats">
            <div className="campaign-stat-card">
              <span>{t("insights.additionalUnits")}</span>
              <strong>
                {formatNumber(result.forecast_impact.totals?.additional_units)}
              </strong>
            </div>

            <div className="campaign-stat-card">
              <span>{t("insights.baseRevenue")}</span>
              <strong>
                {formatCurrency(result.forecast_impact.totals?.base_revenue)}
              </strong>
            </div>

            <div className="campaign-stat-card">
              <span>{t("insights.additionalRevenue")}</span>
              <strong>
                {formatCurrency(result.forecast_impact.totals?.additional_revenue)}
              </strong>
            </div>

            <div className="campaign-stat-card">
              <span>{t("insights.estimatedRoi")}</span>
              <strong>{result.forecast_impact.totals?.estimated_roi ?? "-"}</strong>
            </div>
          </div>

          <div className="campaign-impact-products">
            {result.forecast_impact.products?.map((product) => (
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