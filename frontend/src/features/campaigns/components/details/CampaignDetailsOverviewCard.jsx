import { Card } from "../../../../shared/components";
import { formatCurrency, formatPercent } from "../../utils";
import CampaignStatusBadge from "../CampaignStatusBadge";

function hasForecastValue(value) {
  return value !== null && value !== undefined && value !== "";
}

export default function CampaignDetailsOverviewCard({
  t,
  campaign,
  canUpdate,
  busyAction,
  forecastReadiness,
  onGoForecasting,
  onRecalculateForecast,
}) {
  const hasUplift = hasForecastValue(campaign.forecast_uplift_pct);
  const hasExtraRevenue = hasForecastValue(
    campaign.forecast_additional_revenue,
  );

  const hasMissingForecastValues = !hasUplift || !hasExtraRevenue;

  const checkingForecasts = !!forecastReadiness?.loading;
  const hasCheckedForecasts = !!forecastReadiness?.loaded;
  const missingForecastCount = Number(forecastReadiness?.missingCount || 0);
  const readyForecastCount = Number(forecastReadiness?.readyCount || 0);
  const totalForecastProducts = Number(forecastReadiness?.totalCount || 0);

  const hasProductsWithoutForecast =
    hasCheckedForecasts &&
    totalForecastProducts > 0 &&
    missingForecastCount > 0;

  const canRecalculateNow =
    hasCheckedForecasts &&
    totalForecastProducts > 0 &&
    missingForecastCount === 0 &&
    hasMissingForecastValues;

  const alreadyCalculated =
    hasCheckedForecasts &&
    totalForecastProducts > 0 &&
    missingForecastCount === 0 &&
    !hasMissingForecastValues;

  const showForecastBox = hasProductsWithoutForecast || canRecalculateNow;

  const missingLabel = hasProductsWithoutForecast
    ? t("details.generateForecastFirstShort", {
        defaultValue: "Generate forecast first",
      })
    : canRecalculateNow
      ? t("details.readyToRecalculateShort", {
          defaultValue: "Ready to calculate",
        })
      : t("details.forecastMissingShort", {
          defaultValue: "Needs forecast",
        });

  return (
    <Card>
      <div className="campaign-details-top">
        <div>
          <div className="campaign-details-status-row">
            <CampaignStatusBadge status={campaign.status} />
          </div>

          <h2>{campaign.campaign_name}</h2>

          <p>
            {t(`types.${campaign.campaign_type}`, {
              defaultValue: campaign.campaign_type || "-",
            })}
          </p>
        </div>
      </div>

      <div className="campaign-metrics-grid">
        <div className="metric-card">
          <span>{t("fields.budget")}</span>
          <strong>{formatCurrency(campaign.budget)}</strong>
        </div>

        <div className="metric-card">
          <span>{t("details.duration")}</span>
          <strong>{campaign.duration_days ?? "-"}</strong>
        </div>

        <div className={`metric-card ${!hasUplift ? "metric-card-warning" : ""}`}>
          <span>{t("list.headers.uplift")}</span>

          <strong>
            {hasUplift ? formatPercent(campaign.forecast_uplift_pct) : "-"}
          </strong>

          {!hasUplift ? (
            <small className="metric-warning-label">
              {checkingForecasts
                ? t("details.checkingForecasts", {
                    defaultValue: "Checking forecasts...",
                  })
                : missingLabel}
            </small>
          ) : null}
        </div>

        <div
          className={`metric-card ${
            !hasExtraRevenue ? "metric-card-warning" : ""
          }`}
        >
          <span>{t("details.additionalRevenue")}</span>

          <strong>
            {hasExtraRevenue
              ? formatCurrency(campaign.forecast_additional_revenue)
              : "-"}
          </strong>

          {!hasExtraRevenue ? (
            <small className="metric-warning-label">
              {checkingForecasts
                ? t("details.checkingForecasts", {
                    defaultValue: "Checking forecasts...",
                  })
                : missingLabel}
            </small>
          ) : null}
        </div>
      </div>

      {showForecastBox ? (
        <div className="campaign-forecast-warning-box">
          <div>
            <strong>
              {hasProductsWithoutForecast
                ? t("details.productsNeedForecastTitle", {
                    defaultValue: "Some selected products need forecasts first.",
                  })
                : t("details.forecastReadyToCalculateTitle", {
                    defaultValue: "Forecasts are ready. Recalculate this campaign.",
                  })}
            </strong>

            <p>
              {hasProductsWithoutForecast
                ? t("details.productsNeedForecastText", {
                    ready: readyForecastCount,
                    missing: missingForecastCount,
                    defaultValue: `${readyForecastCount} product(s) have forecasts, but ${missingForecastCount} product(s) still need forecasts. Go to Forecasting, generate the missing forecasts, then come back here.`,
                  })
                : t("details.forecastReadyToCalculateText", {
                    defaultValue:
                      "All selected products have forecasts now. Press Recalculate forecast to show the expected sales increase and extra revenue.",
                  })}
            </p>
          </div>

          <div className="campaign-forecast-warning-actions">
            {hasProductsWithoutForecast ? (
              <button
                type="button"
                className="btn-outline"
                onClick={onGoForecasting}
              >
                {t("actions.goToForecasting", {
                  defaultValue: "Go to Forecasting",
                })}
              </button>
            ) : null}

            {canRecalculateNow && canUpdate ? (
              <button
                type="button"
                className="btn-primary"
                onClick={onRecalculateForecast}
                disabled={busyAction === "recalculate"}
              >
                {busyAction === "recalculate"
                  ? t("actions.updating", {
                      defaultValue: "Updating...",
                    })
                  : t("actions.recalculateForecast", {
                      defaultValue: "Recalculate forecast",
                    })}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {alreadyCalculated ? (
        <div className="campaign-forecast-ready-box">
          {t("details.forecastAlreadyCalculated", {
            defaultValue:
              "Forecast impact is already calculated for this campaign.",
          })}
        </div>
      ) : null}
    </Card>
  );
}