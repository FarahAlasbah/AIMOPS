export const ACTION_OPTION_DEFS = [
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

export const LIMIT_OPTIONS = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

export function normalizeUsers(data) {
  if (Array.isArray(data)) return data;

  const candidates = [data?.users, data?.items, data?.results, data?.data];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

export function getUserId(user) {
  return user?.user_id ?? user?.id ?? user?.userId ?? user?.uid ?? null;
}

export function getUserName(user) {
  if (!user) return "";

  return user?.full_name || user?.name || user?.username || user?.email || "";
}

export function getUsername(user) {
  return user?.username || user?.user_name || "";
}

export function getEmail(user) {
  return user?.email || "";
}

export function getObjectName(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value !== "object") return "";

  return value?.full_name || value?.name || value?.username || value?.email || "";
}

export function humanizeActionRaw(action) {
  if (!action) return "";

  return String(action)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeValue(value) {
  if (value == null || value === "") return "";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function humanizeAction(action, t) {
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

export function getActionClass(action) {
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

export function formatDate(value, t, language) {
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

export function getLogId(log, fallback) {
  return (
    log?.audit_log_id ??
    log?.auditLogId ??
    log?.log_id ??
    log?.logId ??
    log?.id ??
    fallback
  );
}

export function getLogTime(log) {
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

export function getActorId(log) {
  return (
    log?.performed_by_id ??
    log?.performedById ??
    log?.actor_id ??
    log?.actorId ??
    log?.user_id ??
    null
  );
}

export function getTargetId(log) {
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

function findUserByDirectValue(value, usersById) {
  const direct = getObjectName(value);

  if (!direct) return null;

  return (
    usersById.get(`username:${direct}`) ||
    usersById.get(`email:${direct}`) ||
    usersById.get(String(direct)) ||
    null
  );
}

export function getActorName(log, usersById, t) {
  const direct =
    log?.performed_by_name ||
    log?.performedByName ||
    log?.performed_by_username ||
    log?.performedByUsername ||
    log?.actor_name ||
    log?.actorName ||
    log?.actor_username ||
    log?.actorUsername ||
    log?.username ||
    getObjectName(log?.performed_by) ||
    getObjectName(log?.performedBy) ||
    getObjectName(log?.actor);

  if (direct) {
    const user = findUserByDirectValue(direct, usersById);
    const userName = getUserName(user);

    return userName || direct;
  }

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

export function getTargetName(log, usersById, t) {
  const direct =
    log?.target_user_name ||
    log?.targetUserName ||
    log?.target_user_username ||
    log?.targetUserUsername ||
    log?.affected_user_name ||
    log?.affectedUserName ||
    log?.affected_user_username ||
    log?.affectedUserUsername ||
    log?.target_name ||
    log?.targetName ||
    log?.target_username ||
    log?.targetUsername ||
    getObjectName(log?.target_user) ||
    getObjectName(log?.targetUser) ||
    getObjectName(log?.affected_user) ||
    getObjectName(log?.affectedUser) ||
    getObjectName(log?.target);

  if (direct) {
    const user = findUserByDirectValue(direct, usersById);
    const userName = getUserName(user);

    return userName || direct;
  }

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

export function getDetailsText(log, t) {
  const fieldChanged = log?.field_changed ?? log?.fieldChanged;
  const oldValue = log?.old_value ?? log?.oldValue;
  const newValue = log?.new_value ?? log?.newValue;
  const note = log?.note;

  if (fieldChanged) {
    const field = humanizeActionRaw(fieldChanged);
    const oldText = humanizeValue(oldValue);
    const newText = humanizeValue(newValue);

    if (oldText && newText) {
      return t("activityHistory.details.fieldChangedFromTo", {
        field,
        oldValue: oldText,
        newValue: newText,
        defaultValue: `${field} changed from ${oldText} to ${newText}.`,
      });
    }

    if (newText) {
      return t("activityHistory.details.fieldChangedTo", {
        field,
        newValue: newText,
        defaultValue: `${field} changed to ${newText}.`,
      });
    }

    return t("activityHistory.details.fieldChanged", {
      field,
      defaultValue: `${field} was changed.`,
    });
  }

  if (note) return String(note);

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

export function getErrorMessage(error, t) {
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