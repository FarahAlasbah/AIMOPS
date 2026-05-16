import { RefreshCw, ShieldCheck } from "lucide-react";

function ActivityHistoryHeader({ t, loading, onRefresh }) {
  return (
    <div className="activity-history-header">
      <div>
        <div className="activity-history-eyebrow">
          <ShieldCheck size={16} />
          {t("activityHistory.eyebrow", {
            defaultValue: "Admin only",
          })}
        </div>

        <h1>
          {t("activityHistory.title", {
            defaultValue: "Activity History",
          })}
        </h1>

        <p>
          {t("activityHistory.subtitle", {
            defaultValue:
              "See important account changes in one place, including who made the change and who was affected.",
          })}
        </p>
      </div>

      <button
        type="button"
        className="activity-history-refresh"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw size={17} className={loading ? "spinning" : ""} />
        {t("activityHistory.refresh", {
          defaultValue: "Refresh",
        })}
      </button>
    </div>
  );
}

export default ActivityHistoryHeader;