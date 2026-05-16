import { Card } from "../../../../shared/components";
import { formatCurrency, formatPercent } from "../../utils";
import CampaignStatusBadge from "../CampaignStatusBadge";

export default function CampaignDetailsOverviewCard({ t, campaign }) {
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

        <div className="metric-card">
          <span>{t("list.headers.uplift")}</span>
          <strong>{formatPercent(campaign.forecast_uplift_pct)}</strong>
        </div>

        <div className="metric-card">
          <span>{t("details.additionalRevenue")}</span>
          <strong>
            {formatCurrency(campaign.forecast_additional_revenue)}
          </strong>
        </div>
      </div>
    </Card>
  );
}