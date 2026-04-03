// frontend/src/shared/utils/forecastNotifications.js

const WATCH_KEY = "aimops_forecast_watch_v1";
const LOCAL_KEY = "aimops_forecast_local_notifications_v1";

const safeParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const read = (key, fallback = []) => safeParse(localStorage.getItem(key), fallback);
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const uniqueByProductId = (items) => {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const id = String(item?.product_id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      product_id: Number(item.product_id),
      product_name: item.product_name || `#${item.product_id}`,
    });
  }

  return out;
};

export function getWatchedForecasts() {
  return read(WATCH_KEY, []);
}

export function watchForecastProducts(products = []) {
  const current = getWatchedForecasts();
  const next = uniqueByProductId([
    ...current,
    ...products.map((p) => ({
      product_id: Number(p?.product_id),
      product_name: p?.product_name || p?.name || `#${p?.product_id}`,
    })),
  ]);

  write(WATCH_KEY, next);
  return next;
}

export function getLocalForecastNotifications() {
  return read(LOCAL_KEY, []);
}

function saveLocalForecastNotifications(items) {
  write(LOCAL_KEY, items.slice(0, 100));
}

export function syncForecastNotificationQueue(models = []) {
  const watched = getWatchedForecasts();
  if (!watched.length) return;

  const modelMap = new Map(
    (Array.isArray(models) ? models : [])
      .filter((m) => m?.product_id != null)
      .map((m) => [String(m.product_id), m])
  );

  const localNotifs = getLocalForecastNotifications();
  const existingIds = new Set(localNotifs.map((n) => String(n.id)));

  const remaining = [];
  const nextLocal = [...localNotifs];

  for (const watchedItem of watched) {
    const model = modelMap.get(String(watchedItem.product_id));
    const status = String(model?.status || "").toLowerCase();

    if (!model || !["ready", "failed"].includes(status)) {
      remaining.push(watchedItem);
      continue;
    }

    const id = `forecast:${watchedItem.product_id}:${status}:${model?.trained_at || ""}`;

    if (!existingIds.has(id)) {
      nextLocal.unshift({
        id,
        source: "forecast",
        product_id: Number(watchedItem.product_id),
        product_name: model?.product_name || watchedItem.product_name,
        status,
        created_at: new Date().toISOString(),
        trained_at: model?.trained_at || null,
        error: model?.error || null,
      });

      existingIds.add(id);
    }
  }

  write(WATCH_KEY, remaining);
  saveLocalForecastNotifications(nextLocal);
}