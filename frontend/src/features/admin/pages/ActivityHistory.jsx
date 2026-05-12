// frontend/src/features/admin/pages/ActivityHistory.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { getAuditLogs } from "../../../api/auditLogs";
import { getUsers } from "../../../api/users";
import FormSelect from "../../../shared/components/FormSelect";

import "./ActivityHistory.css";

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "user_created", label: "User created" },
  { value: "user_updated", label: "User updated" },
  { value: "user_deleted", label: "User deleted" },
  { value: "user_reactivated", label: "User reactivated" },
  { value: "role_changed", label: "Role changed" },
  { value: "password_changed", label: "Password changed" },
];

const LIMIT_OPTIONS = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

function normalizeUsers(data) {
  if (Array.isArray(data)) return data;

  const candidates = [data?.users, data?.items, data?.results, data?.data];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function getUserId(user) {
  return user?.user_id ?? user?.id ?? user?.userId ?? user?.uid ?? null;
}

function getUserName(user) {
  if (!user) return "";

  return user?.full_name || user?.name || user?.username || user?.email || "";
}

function getObjectName(value) {
  if (!value || typeof value !== "object") return "";

  return value?.full_name || value?.name || value?.username || value?.email || "";
}

function humanizeAction(action) {
  if (!action) return "Activity recorded";

  return String(action)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActionClass(action) {
  const value = String(action || "").toLowerCase();

  if (value.includes("created") || value.includes("reactivated")) {
    return "positive";
  }

  if (value.includes("deleted") || value.includes("removed")) {
    return "danger";
  }

  if (value.includes("password") || value.includes("role")) {
    return "warning";
  }

  if (value.includes("updated") || value.includes("changed")) {
    return "info";
  }

  return "neutral";
}

function formatDate(value) {
  if (!value) return "Time not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getLogId(log, fallback) {
  return (
    log?.audit_log_id ??
    log?.auditLogId ??
    log?.log_id ??
    log?.logId ??
    log?.id ??
    fallback
  );
}

function getLogTime(log) {
  return (
    log?.created_at ??
    log?.createdAt ??
    log?.timestamp ??
    log?.performed_at ??
    log?.performedAt ??
    log?.date ??
    null
  );
}

function getActorId(log) {
  return (
    log?.performed_by_id ??
    log?.performedById ??
    log?.actor_id ??
    log?.actorId ??
    log?.user_id ??
    null
  );
}

function getTargetId(log) {
  return (
    log?.target_user_id ??
    log?.targetUserId ??
    log?.affected_user_id ??
    log?.affectedUserId ??
    log?.target_id ??
    log?.targetId ??
    null
  );
}

function getActorName(log, usersById) {
  const direct =
    log?.performed_by_name ||
    log?.performedByName ||
    log?.actor_name ||
    log?.actorName ||
    getObjectName(log?.performed_by) ||
    getObjectName(log?.performedBy) ||
    getObjectName(log?.actor);

  if (direct) return direct;

  const id = getActorId(log);
  const user = id != null ? usersById.get(String(id)) : null;
  const userName = getUserName(user);

  if (userName) return userName;
  if (id != null) return `User #${id}`;

  return "Unknown user";
}

function getTargetName(log, usersById) {
  const direct =
    log?.target_user_name ||
    log?.targetUserName ||
    log?.affected_user_name ||
    log?.affectedUserName ||
    log?.target_name ||
    log?.targetName ||
    getObjectName(log?.target_user) ||
    getObjectName(log?.targetUser) ||
    getObjectName(log?.affected_user) ||
    getObjectName(log?.affectedUser) ||
    getObjectName(log?.target);

  if (direct) return direct;

  const id = getTargetId(log);
  const user = id != null ? usersById.get(String(id)) : null;
  const userName = getUserName(user);

  if (userName) return userName;
  if (id != null) return `User #${id}`;

  return "No affected user";
}

function getDetailsText(log) {
  const direct =
    log?.message ||
    log?.description ||
    log?.summary ||
    log?.detail ||
    log?.details_text ||
    log?.detailsText;

  if (direct) return String(direct);

  const details = log?.details || log?.metadata || log?.changes || log?.payload || null;

  if (!details) {
    return "No extra details were sent for this action.";
  }

  if (typeof details === "string") {
    return details;
  }

  if (typeof details === "object") {
    const entries = Object.entries(details).slice(0, 5);

    if (!entries.length) {
      return "No extra details were sent for this action.";
    }

    return entries
      .map(([key, value]) => {
        const readableKey = humanizeAction(key);
        const readableValue =
          value && typeof value === "object" ? JSON.stringify(value) : String(value);

        return `${readableKey}: ${readableValue}`;
      })
      .join(" • ");
  }

  return String(details);
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 403) {
    return "You do not have permission to view activity history.";
  }

  if (status === 404) {
    return "The activity history endpoint was not found. Please check the backend route.";
  }

  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    "Could not load activity history. Please try again."
  );
}

function ActivityHistorySkeleton() {
  return (
    <div className="activity-history-list" aria-label="Loading activity history">
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

function ActivityHistory() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);

  const [action, setAction] = useState("");
  const [performedById, setPerformedById] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState("");

  const usersById = useMemo(() => {
    const map = new Map();

    users.forEach((user) => {
      const id = getUserId(user);
      if (id != null) {
        map.set(String(id), user);
      }
    });

    return map;
  }, [users]);

  const userOptions = useMemo(() => {
    return [
      { value: "", label: "Anyone" },
      ...users
        .map((user) => {
          const id = getUserId(user);
          if (id == null) return null;

          return {
            value: String(id),
            label: getUserName(user) || `User #${id}`,
          };
        })
        .filter(Boolean),
    ];
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const hasPrevious = offset > 0;
  const hasNext = offset + logs.length < total;

  const activeFiltersCount = useMemo(() => {
    return [action, performedById, targetUserId].filter(Boolean).length;
  }, [action, performedById, targetUserId]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);

    try {
      const data = await getUsers();
      setUsers(normalizeUsers(data));
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAuditLogs({
        action,
        performedById,
        targetUserId,
        limit,
        offset,
      });

      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setTotal(Number(data.total) || 0);
    } catch (err) {
      setLogs([]);
      setTotal(0);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [action, performedById, targetUserId, limit, offset]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setOffset(0);
    loadLogs();
  };

  const handleResetFilters = () => {
    setAction("");
    setPerformedById("");
    setTargetUserId("");
    setOffset(0);
  };

  const handleLimitChange = (event) => {
    setLimit(Number(event.target.value) || 50);
    setOffset(0);
  };

  const goPrevious = () => {
    if (!hasPrevious) return;
    setOffset(Math.max(0, offset - limit));
  };

  const goNext = () => {
    if (!hasNext) return;
    setOffset(offset + limit);
  };

  return (
    <div className="activity-history-page">
      <div className="activity-history-header">
        <div>
          <div className="activity-history-eyebrow">
            <ShieldCheck size={16} />
            Admin only
          </div>

          <h1>Activity History</h1>

          <p>
            See important account changes in one place, including who made the
            change and who was affected.
          </p>
        </div>

        <button
          type="button"
          className="activity-history-refresh"
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "spinning" : ""} />
          Refresh
        </button>
      </div>

      <div className="activity-history-summary">
        <div className="activity-summary-card">
          <span className="activity-summary-label">Total activities</span>
          <strong>{total}</strong>
        </div>

        <div className="activity-summary-card">
          <span className="activity-summary-label">Showing now</span>
          <strong>{logs.length}</strong>
        </div>

        <div className="activity-summary-card">
          <span className="activity-summary-label">Active filters</span>
          <strong>{activeFiltersCount}</strong>
        </div>
      </div>

      <form className="activity-history-filters" onSubmit={handleApplyFilters}>
        <div className="activity-filter-title">
          <Filter size={17} />
          Filter activity
        </div>

        <div className="activity-filter-grid">
          <FormSelect
            label="Action"
            name="action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            options={ACTION_OPTIONS}
            placeholder="All actions"
            className="activity-filter-select"
          />

          {users.length > 0 ? (
            <FormSelect
              label="Performed by"
              name="performed_by_id"
              value={performedById}
              onChange={(event) => setPerformedById(event.target.value)}
              options={userOptions}
              placeholder="Anyone"
              disabled={usersLoading}
              className="activity-filter-select"
            />
          ) : (
            <label className="activity-filter-field">
              <span>Performed by</span>
              <input
                type="number"
                min="1"
                value={performedById}
                onChange={(event) => setPerformedById(event.target.value)}
                className="activity-filter-control"
                placeholder="User ID"
              />
            </label>
          )}

          {users.length > 0 ? (
            <FormSelect
              label="Affected user"
              name="target_user_id"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
              options={userOptions}
              placeholder="Anyone"
              disabled={usersLoading}
              className="activity-filter-select"
            />
          ) : (
            <label className="activity-filter-field">
              <span>Affected user</span>
              <input
                type="number"
                min="1"
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
                className="activity-filter-control"
                placeholder="User ID"
              />
            </label>
          )}

          <FormSelect
            label="Rows per page"
            name="limit"
            value={String(limit)}
            onChange={handleLimitChange}
            options={LIMIT_OPTIONS}
            placeholder="50"
            className="activity-filter-select"
          />
        </div>

        <div className="activity-filter-actions">
          <button type="submit" className="activity-primary-button">
            <Search size={16} />
            Apply filters
          </button>

          <button
            type="button"
            className="activity-secondary-button"
            onClick={handleResetFilters}
          >
            Clear filters
          </button>
        </div>
      </form>

      {error ? (
        <div className="activity-history-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="activity-history-card">
        <div className="activity-history-card-head">
          <div>
            <h2>Recent activity</h2>
            <p>
              Page {currentPage} of {totalPages}
            </p>
          </div>

          <div className="activity-history-range">
            {total > 0
              ? `${offset + 1}-${Math.min(offset + logs.length, total)} of ${total}`
              : "0 records"}
          </div>
        </div>

        {loading ? (
          <ActivityHistorySkeleton />
        ) : logs.length === 0 ? (
          <div className="activity-history-empty">
            <History size={42} />
            <h3>No activity found</h3>
            <p>
              There are no records for the selected filters yet. Try clearing the
              filters or checking again after new admin actions happen.
            </p>
          </div>
        ) : (
          <div className="activity-history-list">
            {logs.map((log, index) => {
              const actionValue = log?.action || log?.event || log?.type || "";
              const actionLabel = humanizeAction(actionValue);
              const actionClass = getActionClass(actionValue);
              const actorName = getActorName(log, usersById);
              const targetName = getTargetName(log, usersById);
              const detailsText = getDetailsText(log);
              const time = formatDate(getLogTime(log));
              const key = getLogId(log, `${offset}-${index}`);

              return (
                <article className="activity-history-row" key={key}>
                  <div className={`activity-history-icon ${actionClass}`}>
                    <History size={18} />
                  </div>

                  <div className="activity-history-main">
                    <div className="activity-history-row-top">
                      <span className={`activity-action-badge ${actionClass}`}>
                        {actionLabel}
                      </span>

                      <span className="activity-time">
                        <Clock3 size={14} />
                        {time}
                      </span>
                    </div>

                    <div className="activity-history-people">
                      <span>
                        <UserRound size={15} />
                        <strong>{actorName}</strong> performed this action
                      </span>

                      <span className="activity-history-target">
                        Affected: <strong>{targetName}</strong>
                      </span>
                    </div>

                    <p className="activity-history-details">{detailsText}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="activity-history-pagination">
          <button
            type="button"
            className="activity-secondary-button"
            onClick={goPrevious}
            disabled={!hasPrevious || loading}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            className="activity-secondary-button"
            onClick={goNext}
            disabled={!hasNext || loading}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

export default ActivityHistory;