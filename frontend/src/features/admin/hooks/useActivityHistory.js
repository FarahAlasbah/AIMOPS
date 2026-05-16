import { useCallback, useEffect, useMemo, useState } from "react";

import { getAuditLogs } from "../../../api/auditLogs";
import { getUsers } from "../../../api/users";

import {
  ACTION_OPTION_DEFS,
  getEmail,
  getErrorMessage,
  getUserId,
  getUserName,
  getUsername,
  normalizeUsers,
} from "../utils/activityHistoryUtils";

export function useActivityHistory(t) {
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
      const username = getUsername(user);
      const email = getEmail(user);

      if (id != null) {
        map.set(String(id), user);
      }

      if (username) {
        map.set(`username:${username}`, user);
      }

      if (email) {
        map.set(`email:${email}`, user);
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

    if (offset === 0) {
      loadLogs();
      return;
    }

    setOffset(0);
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

  return {
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
  };
}