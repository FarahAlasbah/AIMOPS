import { formatDate } from "../../utils";
import {
  getCampaignEndDate,
  getCampaignId,
  getCampaignStartDate,
} from "../../utils/campaignCalendarUtils";
import CampaignStatusBadge from "../CampaignStatusBadge";

export default function CampaignCalendarCard({ t, campaign, onView }) {
  const campaignId = getCampaignId(campaign);
  const productsCount = campaign.product_count ?? campaign.products?.length ?? 0;

  return (
    <article className="calendar-campaign-card">
      <div className="calendar-campaign-top">
        <div>
          <h3>{campaign.campaign_name}</h3>
          <p>
            {t(`types.${campaign.campaign_type}`, {
              defaultValue: campaign.campaign_type || "-",
            })}
          </p>
        </div>

        <CampaignStatusBadge status={campaign.status} />
      </div>

      <div className="calendar-campaign-grid">
        <div>
          <span>{t("fields.startDate")}</span>
          <strong>{formatDate(getCampaignStartDate(campaign))}</strong>
        </div>

        <div>
          <span>{t("fields.endDate")}</span>
          <strong>{formatDate(getCampaignEndDate(campaign))}</strong>
        </div>

        <div>
          <span>{t("list.headers.products")}</span>
          <strong>{productsCount}</strong>
        </div>

        <div>
          <span>{t("fields.budget")}</span>
          <strong>{campaign.budget ?? "-"}</strong>
        </div>
      </div>

      {campaign.products?.length ? (
        <div className="calendar-products-row">
          <span>{t("details.products")}</span>

          <div className="calendar-products-wrap">
            {campaign.products.map((product) => (
              <span key={product.product_id} className="calendar-product-chip">
                {product.product_name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="calendar-campaign-actions">
        <button
          type="button"
          className="btn-outline"
          onClick={() => onView(campaignId)}
        >
          {t("actions.view")}
        </button>
      </div>
    </article>
  );
}