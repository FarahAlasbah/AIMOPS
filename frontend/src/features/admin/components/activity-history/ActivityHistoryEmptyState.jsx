import { History } from "lucide-react";

function ActivityHistoryEmptyState({ t }) {
  return (
    <div className="activity-history-empty">
      <History size={42} />

      <h3>
        {t("activityHistory.empty.title", {
          defaultValue: "No activity found",
        })}
      </h3>

      <p>
        {t("activityHistory.empty.subtitle", {
          defaultValue:
            "There are no records for the selected filters yet. Try clearing the filters or checking again after new admin actions happen.",
        })}
      </p>
    </div>
  );
}

export default ActivityHistoryEmptyState;