function ActivityHistorySummary({ t, total, showingNow, activeFiltersCount }) {
  return (
    <div className="activity-history-summary">
      <div className="activity-summary-card">
        <span className="activity-summary-label">
          {t("activityHistory.summary.totalActivities", {
            defaultValue: "Total activities",
          })}
        </span>
        <strong>{total}</strong>
      </div>

      <div className="activity-summary-card">
        <span className="activity-summary-label">
          {t("activityHistory.summary.showingNow", {
            defaultValue: "Showing now",
          })}
        </span>
        <strong>{showingNow}</strong>
      </div>

      <div className="activity-summary-card">
        <span className="activity-summary-label">
          {t("activityHistory.summary.activeFilters", {
            defaultValue: "Active filters",
          })}
        </span>
        <strong>{activeFiltersCount}</strong>
      </div>
    </div>
  );
}

export default ActivityHistorySummary;