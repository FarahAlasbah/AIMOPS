import { useTranslation } from "react-i18next";

import ActivityHistoryEmptyState from "../components/activity-history/ActivityHistoryEmptyState";
import ActivityHistoryError from "../components/activity-history/ActivityHistoryError";
import ActivityHistoryFilters from "../components/activity-history/ActivityHistoryFilters";
import ActivityHistoryHeader from "../components/activity-history/ActivityHistoryHeader";
import ActivityHistoryList from "../components/activity-history/ActivityHistoryList";
import ActivityHistoryPagination from "../components/activity-history/ActivityHistoryPagination";
import ActivityHistorySkeleton from "../components/activity-history/ActivityHistorySkeleton";
import ActivityHistorySummary from "../components/activity-history/ActivityHistorySummary";

import { useActivityHistory } from "../hooks/useActivityHistory";

import "./ActivityHistory.css";

function ActivityHistory() {
  const { t, i18n } = useTranslation("admin");

  const {
    logs,
    users,
    usersById,

    action,
    setAction,
    performedById,
    setPerformedById,
    targetUserId,
    setTargetUserId,
    limit,

    total,
    loading,
    usersLoading,
    error,

    actionOptions,
    userOptions,

    totalPages,
    currentPage,
    hasPrevious,
    hasNext,
    activeFiltersCount,

    offset,

    loadLogs,
    handleApplyFilters,
    handleResetFilters,
    handleLimitChange,
    goPrevious,
    goNext,
  } = useActivityHistory(t);

  return (
    <div className="activity-history-page">
      <ActivityHistoryHeader t={t} loading={loading} onRefresh={loadLogs} />

      <ActivityHistorySummary
        t={t}
        total={total}
        showingNow={logs.length}
        activeFiltersCount={activeFiltersCount}
      />

      <ActivityHistoryFilters
        t={t}
        users={users}
        usersLoading={usersLoading}
        action={action}
        setAction={setAction}
        performedById={performedById}
        setPerformedById={setPerformedById}
        targetUserId={targetUserId}
        setTargetUserId={setTargetUserId}
        limit={limit}
        actionOptions={actionOptions}
        userOptions={userOptions}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        onLimitChange={handleLimitChange}
      />

      <ActivityHistoryError message={error} />

      <section className="activity-history-card">
        <div className="activity-history-card-head">
          <div>
            <h2>
              {t("activityHistory.recentTitle", {
                defaultValue: "Recent activity",
              })}
            </h2>

            <p>
              {t("activityHistory.pagination.pageOf", {
                page: currentPage,
                totalPages,
                defaultValue: `Page ${currentPage} of ${totalPages}`,
              })}
            </p>
          </div>

          <div className="activity-history-range">
            {total > 0
              ? t("activityHistory.range.records", {
                  start: offset + 1,
                  end: Math.min(offset + logs.length, total),
                  total,
                  defaultValue: `${offset + 1}-${Math.min(
                    offset + logs.length,
                    total,
                  )} of ${total}`,
                })
              : t("activityHistory.range.zeroRecords", {
                  defaultValue: "0 records",
                })}
          </div>
        </div>

        {loading ? (
          <ActivityHistorySkeleton t={t} />
        ) : logs.length === 0 ? (
          <ActivityHistoryEmptyState t={t} />
        ) : (
          <ActivityHistoryList
            logs={logs}
            offset={offset}
            usersById={usersById}
            t={t}
            language={i18n.language}
          />
        )}

        <ActivityHistoryPagination
          t={t}
          currentPage={currentPage}
          totalPages={totalPages}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          loading={loading}
          onPrevious={goPrevious}
          onNext={goNext}
        />
      </section>
    </div>
  );
}

export default ActivityHistory;