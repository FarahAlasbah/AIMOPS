import i18n from "../../../i18n";

export const emptyApiError = () => ({
  message: "",
  fieldErrors: {},
  status: null,
});

export const tAdmin = (key, options = {}) =>
  i18n.t(key, {
    ns: "admin",
    ...options,
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

export const normalizeErrorState = (value) => {
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

export const formatApiError = (
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