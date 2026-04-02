const FORECAST_WATCH_KEY = "aimops_forecast_watch_v1";
const FORECAST_LOCAL_NOTIFS_KEY = "aimops_local_forecast_notifications_v1";

const safeParse = (v, fallback) => {
  try {
    const parsed = JSON.parse(v);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const read = (key, fallback) => safeParse(localStorage.getItem(key), fallback);

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export function getForecastWatchIds() {
  return read(FORECAST_WATCH_KEY, [])
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x));
}

export function setForecastWatchIds(ids) {
  const unique = Array.from(new Set((ids || []).map((x) => Number(x)).filter((x) => Number.isFinite(x))));
  write(FORECAST_WATCH_KEY, unique);
  return unique;
}

export function addForecastWatchIds(ids) {
  const current = getForecastWatchIds();
  return setForecastWatchIds([...current, ...(ids || [])]);
}

export function removeForecastWatchIds(ids) {
  const removeSet = new Set((ids || []).map((x) => Number(x)));
  const next = getForecastWatchIds().filter((id) => !removeSet.has(id));
  return setForecastWatchIds(next);
}

export function getLocalForecastNotifications() {
  return read(FORECAST_LOCAL_NOTIFS_KEY, []);
}

export function setLocalForecastNotifications(items) {
  write(FORECAST_LOCAL_NOTIFS_KEY, Array.isArray(items) ? items : []);
}

export function appendLocalForecastNotification(item) {
  const current = getLocalForecastNotifications();
  const id = item?.id || `forecast:${item?.product_id}:${item?.status || "ready"}:${item?.trained_at || ""}`;
  const nextItem = {
    id,
    type: item?.type || (item?.status === "failed" ? "warning" : "system"),
    title: item?.title || "",
    message: item?.message || "",
    createdAt: item?.createdAt || new Date().toISOString(),
    product_id: item?.product_id ?? null,
    status: item?.status ?? null,
    trained_at: item?.trained_at ?? null,
  };

  const exists = current.some((x) => String(x?.id) === String(id));
  if (exists) return current;

  const next = [nextItem, ...current].slice(0, 100);
  setLocalForecastNotifications(next);
  return next;
}
