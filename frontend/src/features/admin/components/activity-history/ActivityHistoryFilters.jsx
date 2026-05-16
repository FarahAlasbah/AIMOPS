import { Filter, Search } from "lucide-react";

import FormSelect from "../../../../shared/components/FormSelect";
import { LIMIT_OPTIONS } from "../../utils/activityHistoryUtils";

function ActivityHistoryFilters({
  t,

  users,
  usersLoading,

  action,
  setAction,
  performedById,
  setPerformedById,
  targetUserId,
  setTargetUserId,
  limit,

  actionOptions,
  userOptions,

  onApplyFilters,
  onResetFilters,
  onLimitChange,
}) {
  return (
    <form className="activity-history-filters" onSubmit={onApplyFilters}>
      <div className="activity-filter-title">
        <Filter size={17} />
        {t("activityHistory.filters.title", {
          defaultValue: "Filter activity",
        })}
      </div>

      <div className="activity-filter-grid">
        <FormSelect
          label={t("activityHistory.filters.action", {
            defaultValue: "Action",
          })}
          name="action"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          options={actionOptions}
          placeholder={t("activityHistory.actions.all", {
            defaultValue: "All actions",
          })}
          className="activity-filter-select"
        />

        {users.length > 0 ? (
          <FormSelect
            label={t("activityHistory.filters.performedBy", {
              defaultValue: "Performed by",
            })}
            name="performed_by_id"
            value={performedById}
            onChange={(event) => setPerformedById(event.target.value)}
            options={userOptions}
            placeholder={t("activityHistory.filters.anyone", {
              defaultValue: "Anyone",
            })}
            disabled={usersLoading}
            className="activity-filter-select"
          />
        ) : (
          <label className="activity-filter-field">
            <span>
              {t("activityHistory.filters.performedBy", {
                defaultValue: "Performed by",
              })}
            </span>

            <input
              type="number"
              min="1"
              value={performedById}
              onChange={(event) => setPerformedById(event.target.value)}
              className="activity-filter-control"
              placeholder={t("activityHistory.filters.userIdPlaceholder", {
                defaultValue: "User ID",
              })}
            />
          </label>
        )}

        {users.length > 0 ? (
          <FormSelect
            label={t("activityHistory.filters.affectedUser", {
              defaultValue: "Affected user",
            })}
            name="target_user_id"
            value={targetUserId}
            onChange={(event) => setTargetUserId(event.target.value)}
            options={userOptions}
            placeholder={t("activityHistory.filters.anyone", {
              defaultValue: "Anyone",
            })}
            disabled={usersLoading}
            className="activity-filter-select"
          />
        ) : (
          <label className="activity-filter-field">
            <span>
              {t("activityHistory.filters.affectedUser", {
                defaultValue: "Affected user",
              })}
            </span>

            <input
              type="number"
              min="1"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
              className="activity-filter-control"
              placeholder={t("activityHistory.filters.userIdPlaceholder", {
                defaultValue: "User ID",
              })}
            />
          </label>
        )}

        <FormSelect
          label={t("activityHistory.filters.rowsPerPage", {
            defaultValue: "Rows per page",
          })}
          name="limit"
          value={String(limit)}
          onChange={onLimitChange}
          options={LIMIT_OPTIONS}
          placeholder="50"
          className="activity-filter-select"
        />
      </div>

      <div className="activity-filter-actions">
        <button type="submit" className="activity-primary-button">
          <Search size={16} />
          {t("activityHistory.filters.apply", {
            defaultValue: "Apply filters",
          })}
        </button>

        <button
          type="button"
          className="activity-secondary-button"
          onClick={onResetFilters}
        >
          {t("activityHistory.filters.clear", {
            defaultValue: "Clear filters",
          })}
        </button>
      </div>
    </form>
  );
}

export default ActivityHistoryFilters;