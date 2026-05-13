// frontend/src/features/admin/hooks/useUsers.js
import { useCallback, useState } from "react";
import i18n from "../../../i18n";
import {
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
  reactivateUser,
  updateUser,
  changeUserPassword,
} from "../../../api/users";

const emptyApiError = () => ({
  message: "",
  fieldErrors: {},
  status: null,
});

const statusFallbackKeys = {
  400: "apiErrors.invalidRequest",
  401: "apiErrors.sessionExpired",
  403: "apiErrors.noPermission",
  404: "apiErrors.userNotFound",
  409: "apiErrors.conflict",
  422: "apiErrors.invalidFields",
  429: "apiErrors.tooManyRequests",
  500: "apiErrors.serverError",
  502: "apiErrors.serverUnavailable",
  503: "apiErrors.serverUnavailable",
};

const tAdmin = (key, options = {}) =>
  i18n.t(key, {
    ns: "admin",
    ...options,
  });

const getStatusFallback = (status) => {
  const key = statusFallbackKeys[status];

  if (!key) return "";

  return tAdmin(key);
};

const humanizeFieldName = (field) =>
  String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const valueToMessage = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(valueToMessage).filter(Boolean).join(" | ");
  }

  if (typeof value === "object") {
    return (
      value.message ||
      value.msg ||
      value.error ||
      value.detail ||
      value.reason ||
      ""
    );
  }

  return String(value);
};

const extractFieldErrorsFromDetailArray = (detail) => {
  const fieldErrors = {};

  detail.forEach((item) => {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    const field = loc.filter((part) => part !== "body").at(-1);

    if (!field) return;

    const message = valueToMessage(item?.msg || item?.message || item);
    if (!message) return;

    fieldErrors[field] = fieldErrors[field]
      ? `${fieldErrors[field]} | ${message}`
      : message;
  });

  return fieldErrors;
};

const extractFieldErrorsFromObject = (object) => {
  const fieldErrors = {};

  if (!object || typeof object !== "object" || Array.isArray(object)) {
    return fieldErrors;
  }

  const ignoredKeys = new Set([
    "message",
    "msg",
    "error",
    "detail",
    "success",
    "status",
    "code",
  ]);

  Object.entries(object).forEach(([key, value]) => {
    if (ignoredKeys.has(key)) return;

    const message = valueToMessage(value);
    if (!message) return;

    fieldErrors[key] = message;
  });

  return fieldErrors;
};

const extractFieldErrors = (data) => {
  if (!data || typeof data !== "object") return {};

  const fromDetailArray = Array.isArray(data.detail)
    ? extractFieldErrorsFromDetailArray(data.detail)
    : {};

  const fromErrorsObject = extractFieldErrorsFromObject(data.errors);
  const fromDetailObject =
    data.detail && typeof data.detail === "object" && !Array.isArray(data.detail)
      ? extractFieldErrorsFromObject(data.detail)
      : {};

  return {
    ...fromDetailObject,
    ...fromErrorsObject,
    ...fromDetailArray,
  };
};

const extractBackendMessage = (data) => {
  if (!data) return "";

  if (typeof data === "string") return data;

  if (typeof data !== "object") return "";

  const candidates = [
    data.message,
    data.error,
    data.reason,
    typeof data.detail === "string" ? data.detail : "",
    data.detail?.message,
    data.detail?.msg,
    data.detail?.error,
  ];

  return candidates.map(valueToMessage).find(Boolean) || "";
};

const normalizeErrorState = (value) => {
  if (!value) return emptyApiError();

  if (typeof value === "string") {
    return {
      ...emptyApiError(),
      message: value,
    };
  }

  return {
    message: value.message || "",
    fieldErrors: value.fieldErrors || {},
    status: value.status ?? null,
  };
};

const formatApiError = (
  error,
  fallbackMessage = tAdmin("apiErrors.generic"),
) => {
  const response = error?.response;
  const status = response?.status ?? null;
  const data = response?.data || null;

  const fieldErrors = extractFieldErrors(data);

  if (!response) {
    const message =
      error?.code === "ECONNABORTED"
        ? tAdmin("apiErrors.timeout")
        : error?.message?.toLowerCase?.().includes("network")
          ? tAdmin("apiErrors.cannotConnect")
          : error?.message || tAdmin("apiErrors.cannotReach");

    return {
      message,
      fieldErrors: {},
      status: null,
    };
  }

  const backendMessage = extractBackendMessage(data);
  const statusMessage = getStatusFallback(status);

  let message = backendMessage || statusMessage || fallbackMessage;

  if (!backendMessage && Object.keys(fieldErrors).length > 0) {
    message =
      statusMessage ||
      Object.entries(fieldErrors)
        .map(
          ([field, fieldMessage]) =>
            `${humanizeFieldName(field)}: ${fieldMessage}`,
        )
        .join(" | ");
  }

  return {
    message,
    fieldErrors,
    status,
  };
};

const normalizeUsersResponse = (raw) => {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.users)
      ? raw.users
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

  return list.map((u) => {
    const status = String(u.status || "").toLowerCase();

    return {
      ...u,
      id: u.user_id ?? u.id,
      name: u.full_name ?? u.name ?? "",
      role: u.role_name ?? u.role ?? "",
      is_active: status === "active",
      status,
    };
  });
};

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiErrorState, setApiErrorState] = useState(emptyApiError);

  const setApiError = useCallback((value) => {
    setApiErrorState(normalizeErrorState(value));
  }, []);

  const clearApiError = useCallback(() => {
    setApiErrorState(emptyApiError());
  }, []);

  const runUserAction = useCallback(
    async (action, fallbackMessage) => {
      try {
        clearApiError();
        return await action();
      } catch (error) {
        const formatted = formatApiError(error, fallbackMessage);
        setApiErrorState(formatted);
        throw error;
      }
    },
    [clearApiError],
  );

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      clearApiError();

      const raw = await getUsers();
      setUsers(normalizeUsersResponse(raw));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setApiErrorState(formatApiError(error, tAdmin("apiErrors.loadUsers")));
    } finally {
      setLoading(false);
    }
  }, [clearApiError]);

  const addUser = useCallback(
    async (payload) =>
      runUserAction(
        () => createUser(payload),
        tAdmin("apiErrors.createUser"),
      ),
    [runUserAction],
  );

  const changeRole = useCallback(
    async (userId, roleId) =>
      runUserAction(
        () => updateUserRole(userId, roleId),
        tAdmin("apiErrors.updateRole"),
      ),
    [runUserAction],
  );

  const updateUserInfo = useCallback(
    async (userId, payload) =>
      runUserAction(
        () => updateUser(userId, payload),
        tAdmin("apiErrors.updateUser"),
      ),
    [runUserAction],
  );

  const removeUser = useCallback(
    async (userId) =>
      runUserAction(
        () => deleteUser(userId),
        tAdmin("apiErrors.deleteUser"),
      ),
    [runUserAction],
  );

  const undoDelete = useCallback(
    async (userId) =>
      runUserAction(
        () => reactivateUser(userId),
        tAdmin("apiErrors.restoreUser"),
      ),
    [runUserAction],
  );

  const changePassword = useCallback(
    async (userId, currentPassword, newPassword) =>
      runUserAction(
        () => changeUserPassword(userId, currentPassword, newPassword),
        tAdmin("apiErrors.updatePassword"),
      ),
    [runUserAction],
  );

  return {
    users,
    loading,

    apiError: apiErrorState.message,
    apiFieldErrors: apiErrorState.fieldErrors,
    apiStatus: apiErrorState.status,
    apiErrorState,

    setApiError,
    clearApiError,

    fetchUsers,
    addUser,
    changeRole,
    updateUserInfo,
    removeUser,
    undoDelete,
    changePassword,
  };
};