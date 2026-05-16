import { formatDate } from "../../utils";
import CampaignCalendarCard from "./CampaignCalendarCard";

export default function CampaignCalendarGroups({ t, groupedCampaigns, onView }) {
  return (
    <div className="calendar-cards">
      {groupedCampaigns.map(([dateKey, items]) => (
        <div key={dateKey} className="calendar-day-group">
          <div className="calendar-day-title">{formatDate(dateKey)}</div>

          {items.map((campaign) => (
            <CampaignCalendarCard
              key={campaign.campaign_id ?? campaign.id}
              t={t}
              campaign={campaign}
              onView={onView}
            />
          ))}
        </div>
      ))}
    </div>
  );
}