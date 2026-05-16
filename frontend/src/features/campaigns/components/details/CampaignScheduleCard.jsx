import { Card } from "../../../../shared/components";
import { formatDate } from "../../utils";

export default function CampaignScheduleCard({ t, campaign }) {
  return (
    <Card>
      <div className="details-section">
        <h3>{t("details.schedule")}</h3>

        <div className="details-list">
          <div>
            <span>{t("fields.startDate")}</span>
            <strong>{formatDate(campaign.start_date)}</strong>
          </div>

          <div>
            <span>{t("fields.endDate")}</span>
            <strong>{formatDate(campaign.end_date)}</strong>
          </div>

          <div>
            <span>{t("details.createdAt")}</span>
            <strong>{formatDate(campaign.created_at)}</strong>
          </div>

          <div>
            <span>{t("details.productCount")}</span>
            <strong>{campaign.product_count ?? campaign.products?.length ?? 0}</strong>
          </div>
        </div>
      </div>
    </Card>
  );
}