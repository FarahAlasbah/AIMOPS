// frontend/src/features/forecasting/utils/forecastingUtils.js
export const POLL_MS = 4000;

export const NO_DATA_HINTS = [
  "no data",
  "no usable",
  "not enough",
  "insufficient",
  "sales data",
  "history",
  "upload",
  "empty",
];

export const normalizeStatus = (value) => {
  const v = String(value || "").toLowerCase().trim();

  if (["ready", "done", "success", "completed"].includes(v)) return "ready";

  if (["training", "queued", "pending", "running"].includes(v)) {
    return "training";
  }

  if (["failed", "error"].includes(v)) return "failed";

  return "idle";
};

export const isLikelyNoDataMessage = (value) => {
  const text = String(value || "").toLowerCase();
  return NO_DATA_HINTS.some((token) => text.includes(token));
};

const isTrueFlag = (value) =>
  value === true || String(value).toLowerCase() === "true";

const isFalseFlag = (value) =>
  value === false || String(value).toLowerCase() === "false";

const firstExistingValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
};

const firstValidTime = (...values) => {
  for (const value of values) {
    if (!value) continue;

    const time = new Date(value).getTime();

    if (Number.isFinite(time) && time > 0) {
      return time;
    }
  }

  return null;
};

export const hasExistingForecast = (row) => {
  return Boolean(
    firstExistingValue(
      row?.trained_at,
      row?.model_trained_at,
      row?.forecast_trained_at,
      row?.forecast_generated_at,
      row?.generated_at,
      row?.last_generated_at,
      row?.forecast_id,
      row?.model_id,
      row?.has_forecast,
    ),
  );
};

export const getProductChangedAtMs = (product) => {
  return firstValidTime(
    product?.stats?.data_updated_at,
    product?.stats?.last_upload_at,
    product?.stats?.uploaded_at,
    product?.stats?.updated_at,
    product?.data_updated_at,
    product?.sales_updated_at,
    product?.latest_upload_at,
    product?.latest_upload_date,
    product?.last_upload_at,
    product?.last_uploaded_at,
    product?.uploaded_at,
    product?.updated_at,
    product?.modified_at,
    product?.stats?.last_sale,
    product?.last_sale,
  );
};

export const getForecastTrainedAtMs = (row) => {
  return firstValidTime(
    row?.trained_at,
    row?.model_trained_at,
    row?.forecast_trained_at,
    row?.forecast_generated_at,
    row?.generated_at,
    row?.last_generated_at,
    row?.updated_at,
    row?.created_at,
  );
};

export const isForecastOutdated = (product, row) => {
  const hasStaleFlag = [
    row?.needs_retrain,
    row?.needs_regeneration,
    row?.is_stale,
    row?.stale,
    row?.outdated,
    row?.data_changed,
    product?.needs_retrain,
    product?.needs_regeneration,
    product?.forecast_stale,
    product?.data_changed,
  ].some(isTrueFlag);

  if (hasStaleFlag) return true;

  const hasNotCurrentFlag = [
    row?.up_to_date,
    row?.is_current,
    row?.forecast_up_to_date,
    row?.forecast_is_current,
    product?.forecast_up_to_date,
    product?.forecast_is_current,
  ].some(isFalseFlag);

  if (hasNotCurrentFlag) return true;

  const productChangedAt = getProductChangedAtMs(product);
  const forecastTrainedAt = getForecastTrainedAtMs(row);

  if (!productChangedAt || !forecastTrainedAt) return false;

  return productChangedAt > forecastTrainedAt;
};

export const shouldShowRegenerate = (product, row) => {
  const status = normalizeStatus(row?.status || row?.forecast_status);

  if (isForecastOutdated(product, row)) return true;

  return status === "training" && hasExistingForecast(row);
};

export const shouldRetrainForecast = (product, row) => {
  const status = normalizeStatus(row?.status || row?.forecast_status);

  return (
    status === "ready" ||
    status === "failed" ||
    status === "training" ||
    shouldShowRegenerate(product, row)
  );
};

export const fmtNumber = (value, locale = "en") => {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    maximumFractionDigits: 2,
  }).format(n);
};

export const fmtMoney = (value, locale = "en") => {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
};

export const fmtDate = (value, locale = "en") => {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const toDateKey = (value) => {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};