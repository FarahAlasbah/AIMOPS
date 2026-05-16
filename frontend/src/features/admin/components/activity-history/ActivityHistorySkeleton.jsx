function ActivityHistorySkeleton({ t }) {
  return (
    <div
      className="activity-history-list"
      aria-label={t("activityHistory.loading", {
        defaultValue: "Loading activity history",
      })}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="activity-history-row skeleton-row" key={index}>
          <div className="skeleton-icon" />
          <div className="skeleton-content">
            <div className="skeleton-line wide" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line small" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityHistorySkeleton;