import { Card } from "../../../../shared/components";

export default function CampaignTextSummaryCard({ t, campaign }) {
  return (
    <Card>
      <div className="details-section">
        <h3>{t("details.summary")}</h3>

        <div className="details-text-block">
          <h4>{t("fields.description")}</h4>
          <p>{campaign.description || "-"}</p>
        </div>

        <div className="details-text-block">
          <h4>{t("fields.notes")}</h4>
          <p>{campaign.notes || "-"}</p>
        </div>

        <div className="details-text-block">
          <h4>{t("details.targetAudience")}</h4>
          <p>{campaign.target_audience || "-"}</p>
        </div>
      </div>
    </Card>
  );
}