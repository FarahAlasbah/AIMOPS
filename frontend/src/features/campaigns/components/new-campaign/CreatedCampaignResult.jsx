import { Card } from "../../../../shared/components";
import CampaignInsights from "../CampaignInsights";

export default function CreatedCampaignResult({ t, createdResult, onView, onCreateAnother }) {
  if (!createdResult) return null;

  return (
    <Card>
      <div className="campaign-created-top">
        <div>
          <h3>{createdResult.campaign_name}</h3>
        </div>

        <div className="campaign-created-actions">
          <button type="button" className="btn-outline" onClick={onView}>
            {t("actions.view")}
          </button>

          <button type="button" className="btn-primary" onClick={onCreateAnother}>
            {t("actions.createAnother")}
          </button>
        </div>
      </div>

      <CampaignInsights result={createdResult} />
    </Card>
  );
}