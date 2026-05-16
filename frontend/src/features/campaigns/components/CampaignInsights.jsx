import { useTranslation } from "react-i18next";
import { formatCurrency, formatNumber, formatPercent } from "../utils";
import "./CampaignInsights.css";

const getConfidenceClass = (value) => {
  const v = String(value || "").toLowerCase().trim();

  if (v.includes("high")) return "high";
  if (v.includes("medium") || v.includes("normal")) return "medium";
  if (v.includes("low")) return "low";

  return "unknown";
};

const translateKnownLevel = (value, t, baseKey) => {
  const normalized = String(value || "").toLowerCase().trim();

  if (normalized.includes("high")) {
    return t(`${baseKey}.high`);
  }

  if (normalized.includes("medium") || normalized.includes("normal")) {
    return t(`${baseKey}.medium`);
  }

  if (normalized.includes("low")) {
    return t(`${baseKey}.low`);
  }

  if (!normalized) return "-";

  return t(`${baseKey}.unknown`, {
    defaultValue: value,
  });
};

const hasItems = (value) => Array.isArray(value) && value.length > 0;

const hasObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const CampaignInsights = ({ result }) => {
  const { t } = useTranslation("campaigns");

  if (!result) return null;

  const dateSuggestions = hasItems(result.date_suggestions)
    ? result.date_suggestions
    : [];

  const forecastImpact = hasObject(result.forecast_impact)
    ? result.forecast_impact
    : null;

  const consultation = hasObject(result.consultation)
    ? result.consultation
    : null;

  if (!dateSuggestions.length && !forecastImpact && !consultation) {
    return null;
  }

  return (
    <div className="campaign-insights-stack">
      {dateSuggestions.length ? (
        <div className="campaign-insights-card">
          <div className="campaign-insights-header">
            <h3>{t("insights.dateSuggestions")}</h3>
          </div>

          <div className="campaign-suggestions-list">
            {dateSuggestions.map((item, index) => (
              <div
                key={`${item.label || item.start_date || "suggestion"}-${index}`}
                className="campaign-suggestion-row"
              >
                <div className="campaign-suggestion-main">
                  <h4>{item.label || "-"}</h4>

                  <p className="campaign-suggestion-date">
                    {item.start_date || "-"} → {item.end_date || "-"}
                  </p>

                  {item.note ? (
                    <p className="campaign-suggestion-note">{item.note}</p>
                  ) : null}
                </div>

                <div className="campaign-suggestion-metrics">
                  <div>
                    <span>{t("insights.forecastQuantity")}</span>
                    <strong>{formatNumber(item.forecast_quantity)}</strong>
                  </div>

                  <div>
                    <span>{t("insights.uplift")}</span>
                    <strong>{formatPercent(item.forecast_uplift_pct)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {forecastImpact ? (
        <div className="campaign-insights-card">
          <div className="campaign-insights-header">
            <h3>{t("insights.forecastImpact")}</h3>

            <div className="campaign-insights-meta">
              <span>{t("insights.confidence")}:</span>

              <span
                className={`campaign-confidence-chip ${getConfidenceClass(
                  forecastImpact.confidence,
                )}`}
              >
                {translateKnownLevel(
                  forecastImpact.confidence,
                  t,
                  "insights.confidenceLevels",
                )}
              </span>
            </div>
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
          </div>

          {hasItems(forecastImpact.products) ? (
            <div className="campaign-impact-products">
              {forecastImpact.products.map((product, index) => (
                <div
                  key={product.product_id ?? `${product.product_name}-${index}`}
                  className="campaign-impact-product"
                >
                  <div className="campaign-impact-product-top">
                    <div>
                      <h4>{product.product_name || "-"}</h4>
                      <p>{product.category || "-"}</p>
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
                      <strong>
                        {formatCurrency(product.additional_revenue)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {consultation ? (
        <div className="campaign-insights-card">
          <div className="campaign-insights-header">
            <h3>{t("insights.businessAdvice")}</h3>

            <div className="campaign-insights-meta">
              <span>
                {t("insights.risk")}:{" "}
                {translateKnownLevel(
                  consultation.risk_level,
                  t,
                  "insights.riskLevels",
                )}
              </span>

              <span className="campaign-insights-meta-separator">·</span>

              <span>{t("insights.confidence")}:</span>

              <span
                className={`campaign-confidence-chip ${getConfidenceClass(
                  consultation.confidence,
                )}`}
              >
                {translateKnownLevel(
                  consultation.confidence,
                  t,
                  "insights.confidenceLevels",
                )}
              </span>
            </div>
          </div>

          <div className="campaign-advice-box">
            <p>{consultation.advice || "-"}</p>

            {hasItems(consultation.recommendations) ? (
              <ul>
                {consultation.recommendations.map((item, index) => (
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