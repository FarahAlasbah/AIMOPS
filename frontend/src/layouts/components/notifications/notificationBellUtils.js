export const SEEN_REMINDERS_KEY = "aimops_seen_reminders_v1";
export const HIDDEN_REMINDERS_KEY = "aimops_hidden_reminders_v1";

export const safeJsonParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const loadSet = (key) =>
  new Set(safeJsonParse(localStorage.getItem(key), []));

export const saveSet = (key, set) => {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
};

export const fmtDateTime = (iso, locale = undefined) => {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);

  return date.toLocaleString(locale);
};

export const getForecastLink = (productId) => {
  if (!productId) return "/app/forecasting";
  return `/app/forecasting/${productId}`;
};

export const normalizeNotif = (notification) => {
  const type = notification?.type ?? "";
  const relatedId =
    notification?.related_id ??
    notification?.entity_id ??
    notification?.entityId ??
    null;

  const relatedType = notification?.related_type ?? null;

  let link = null;

  switch (type) {
    case "event_detection":
      link = "/app/events";
      break;

    case "event_reminder":
      if (relatedId && relatedType === "event") {
        link = `/app/events/${relatedId}`;
      } else {
        link = "/app/events";
      }
      break;

    case "forecast_ready":
    case "forecast-ready":
    case "forecast":
    case "forecast-failed":
      link = getForecastLink(relatedId);
      break;

    case "campaign":
      if (relatedId) link = `/app/campaigns/${relatedId}`;
      break;

    case "product":
      if (relatedId) link = `/app/products/${relatedId}`;
      else link = "/app/products";
      break;

    default:
      if (notification?.title?.toLowerCase().includes("product")) {
        link = "/app/products";
      } else if (notification?.title?.toLowerCase().includes("event")) {
        link = "/app/events";
      } else if (notification?.title?.toLowerCase().includes("forecast")) {
        link = "/app/forecasting";
      } else {
        link = null;
      }
  }

  return {
    id:
      notification?.notification_id ??
      notification?.id ??
      notification?._id ??
      `${notification?.created_at || ""}:${notification?.title || ""}`,
    title: notification?.title ?? "",
    message: notification?.message ?? "",
    type,
    isRead: Boolean(
      notification?.is_read ??
        notification?.isRead ??
        notification?.read ??
        notification?.read_at,
    ),
    createdAt: notification?.created_at ?? notification?.createdAt ?? "",
    link,
    raw: notification,
  };
};

export const dedupeById = (items) => {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const id = String(item?.id ?? "");
    if (!id || seen.has(id)) continue;

    seen.add(id);
    output.push(item);
  }

  return output;
};