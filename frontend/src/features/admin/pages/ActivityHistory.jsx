// frontend/src/features/admin/pages/ActivityHistory.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

const ACTION_OPTION_DEFS = [
  { value: "", labelKey: "activityHistory.actions.all" },
  { value: "user_created", labelKey: "activityHistory.actions.userCreated" },
  { value: "user_updated", labelKey: "activityHistory.actions.userUpdated" },
  { value: "user_deleted", labelKey: "activityHistory.actions.userDeleted" },
  {
    value: "user_reactivated",
    labelKey: "activityHistory.actions.userReactivated",
  },
  { value: "role_changed", labelKey: "activityHistory.actions.roleChanged" },
  {
    value: "password_changed",
    labelKey: "activityHistory.actions.passwordChanged",
  },
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

function humanizeActionRaw(action) {
  if (!action) return "";

  return String(action)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeAction(action, t) {
  if (!action) {
    return t("activityHistory.fallbacks.activityRecorded", {
      defaultValue: "Activity recorded",
    });
  }

  const key = `activityHistory.actionLabels.${String(action)}`;

  return t(key, {
    defaultValue: humanizeActionRaw(action),
  });
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

function formatDate(value, t, language) {
  if (!value) {
    return t("activityHistory.fallbacks.timeNotAvailable", {
      defaultValue: "Time not available",
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(language || undefined, {
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

function getActorName(log, usersById, t) {
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
  if (id != null) {
    return t("activityHistory.fallbacks.userWithId", {
      id,
      defaultValue: `User #${id}`,
    });
  }

  return t("activityHistory.fallbacks.unknownUser", {
    defaultValue: "Unknown user",
  });
}

function getTargetName(log, usersById, t) {
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
  if (id != null) {
    return t("activityHistory.fallbacks.userWithId", {
      id,
      defaultValue: `User #${id}`,
    });
  }

  return t("activityHistory.fallbacks.noAffectedUser", {
    defaultValue: "No affected user",
  });
}

function getDetailsText(log, t) {
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
    return t("activityHistory.fallbacks.noExtraDetails", {
      defaultValue: "No extra details were sent for this action.",
    });
  }

  if (typeof details === "string") {
    return details;
  }

  if (typeof details === "object") {
    const entries = Object.entries(details).slice(0, 5);

    if (!entries.length) {
      return t("activityHistory.fallbacks.noExtraDetails", {
        defaultValue: "No extra details were sent for this action.",
      });
    }

    return entries
      .map(([key, value]) => {
        const readableKey = humanizeActionRaw(key);
        const readableValue =
          value && typeof value === "object" ? JSON.stringify(value) : String(value);

        return `${readableKey}: ${readableValue}`;
      })
      .join(" • ");
  }

  return String(details);
}

function getErrorMessage(error, t) {
  const status = error?.response?.status;

  if (status === 403) {
    return t("activityHistory.errors.forbidden", {
      defaultValue: "You do not have permission to view activity history.",
    });
  }

  if (status === 404) {
    return t("activityHistory.errors.notFound", {
      defaultValue:
        "The activity history endpoint was not found. Please check the backend route.",
    });
  }

  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    t("activityHistory.errors.loadFailed", {
      defaultValue: "Could not load activity history. Please try again.",
    })
  );
}

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

function ActivityHistory() {
  const { t, i18n } = useTranslation("admin");

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

  const actionOptions = useMemo(
    () =>
      ACTION_OPTION_DEFS.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    [t],
  );

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
      {
        value: "",
        label: t("activityHistory.filters.anyone", {
          defaultValue: "Anyone",
        }),
      },
      ...users
        .map((user) => {
          const id = getUserId(user);
          if (id == null) return null;

          return {
            value: String(id),
            label:
              getUserName(user) ||
              t("activityHistory.fallbacks.userWithId", {
                id,
                defaultValue: `User #${id}`,
              }),
          };
        })
        .filter(Boolean),
    ];
  }, [users, t]);

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
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }, [action, performedById, targetUserId, limit, offset, t]);

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
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "spinning" : ""} />
          {t("activityHistory.refresh", {
            defaultValue: "Refresh",
          })}
        </button>
      </div>

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
          <strong>{logs.length}</strong>
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

      <form className="activity-history-filters" onSubmit={handleApplyFilters}>
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
            onChange={handleLimitChange}
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
            onClick={handleResetFilters}
          >
            {t("activityHistory.filters.clear", {
              defaultValue: "Clear filters",
            })}
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
        ) : (
          <div className="activity-history-list">
            {logs.map((log, index) => {
              const actionValue = log?.action || log?.event || log?.type || "";
              const actionLabel = humanizeAction(actionValue, t);
              const actionClass = getActionClass(actionValue);
              const actorName = getActorName(log, usersById, t);
              const targetName = getTargetName(log, usersById, t);
              const detailsText = getDetailsText(log, t);
              const time = formatDate(getLogTime(log), t, i18n.language);
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
                        <strong>{actorName}</strong>{" "}
                        {t("activityHistory.log.performedAction", {
                          defaultValue: "performed this action",
                        })}
                      </span>

                      <span className="activity-history-target">
                        {t("activityHistory.log.affected", {
                          defaultValue: "Affected:",
                        })}{" "}
                        <strong>{targetName}</strong>
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
            onClick={goNext}
            disabled={!hasNext || loading}
          >
            {t("activityHistory.pagination.next", {
              defaultValue: "Next",
            })}
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

export default ActivityHistory;