import { ChevronLeft, ChevronRight } from "lucide-react";

function ActivityHistoryPagination({
  t,
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  loading,
  onPrevious,
  onNext,
}) {
  return (
    <div className="activity-history-pagination">
      <button
        type="button"
        className="activity-secondary-button"
        onClick={onPrevious}
        disabled={!hasPrevious || loading}
      >
        <ChevronLeft size={16} />
        {t("activityHistory.pagination.previous", {
          defaultValue: "Previous",
        })}
      </button>

      <span>
        {t("activityHistory.pagination.pageOf", {
          page: currentPage,
          totalPages,
          defaultValue: `Page ${currentPage} of ${totalPages}`,
        })}
      </span>

      <button
        type="button"
        className="activity-secondary-button"
        onClick={onNext}
        disabled={!hasNext || loading}
      >
        {t("activityHistory.pagination.next", {
          defaultValue: "Next",
        })}
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default ActivityHistoryPagination;