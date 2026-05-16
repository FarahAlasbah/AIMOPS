export const POLL_MS = 4000;
export const MAX_FORECAST_DAYS = 90;
export const DEFAULT_VISIBLE_DAYS = 14;
export const WINDOW_PRESETS = [14, 21, 30, 60, 90];

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

const EXPLANATION_CACHE_PREFIX = "aimops_forecast_explanation_v1";

const getExplanationCacheKey = (productId) =>
  `${EXPLANATION_CACHE_PREFIX}:${String(productId)}`;

export const stripCodeFence = (value) => {
  const text = String(value ?? "").trim();

  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
};

export const tryParseJsonString = (value) => {
  if (typeof value !== "string") return null;

  const cleaned = stripCodeFence(value);

  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    return null;
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

export const normalizeExplanationResponse = (raw) => {
  if (!raw) return null;

  const base =
    typeof raw === "string"
      ? { explanation: raw }
      : raw && typeof raw === "object"
        ? { ...raw }
        : null;

  if (!base) return null;

  const parsedFromExplanation = tryParseJsonString(base.explanation);

  if (parsedFromExplanation && typeof parsedFromExplanation === "object") {
    return {
      ...base,
      ...parsedFromExplanation,
      explanation: String(parsedFromExplanation.explanation || "").trim(),
      key_drivers: Array.isArray(parsedFromExplanation.key_drivers)
        ? parsedFromExplanation.key_drivers
        : Array.isArray(base.key_drivers)
          ? base.key_drivers
          : [],
      generated_at:
        base.generated_at ||
        parsedFromExplanation.generated_at ||
        new Date().toISOString(),
      cached: base.cached ?? parsedFromExplanation.cached ?? false,
    };
  }

  return {
    ...base,
    explanation: stripCodeFence(base.explanation),
    key_drivers: Array.isArray(base.key_drivers) ? base.key_drivers : [],
    generated_at: base.generated_at || new Date().toISOString(),
    cached: base.cached ?? false,
  };
};

export const readExplanationCache = (productId) => {
  try {
    const raw = localStorage.getItem(getExplanationCacheKey(productId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return normalizeExplanationResponse(parsed);
  } catch {
    return null;
  }
};

export const writeExplanationCache = (productId, value) => {
  try {
    const normalized = normalizeExplanationResponse(value);

    if (!normalized?.explanation) return;

    localStorage.setItem(
      getExplanationCacheKey(productId),
      JSON.stringify({
        ...normalized,
        cached: true,
        saved_at: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore storage errors
  }
};

export const clearExplanationCache = (productId) => {
  try {
    localStorage.removeItem(getExplanationCacheKey(productId));
  } catch {
    // ignore storage errors
  }
};

export const normalizeStatus = (value) => {
  const v = String(value || "").toLowerCase();

  if (["ready", "done", "success", "completed"].includes(v)) return "ready";

  if (["training", "queued", "pending", "running"].includes(v)) {
    return "training";
  }

  if (["failed", "error"].includes(v)) return "failed";

  return "idle";
};

export const getConfidenceClass = (value) => {
  const v = String(value || "").toLowerCase().trim();

  if (v.includes("high")) return "high";
  if (v.includes("medium") || v.includes("normal")) return "medium";
  if (v.includes("low")) return "low";

  return "unknown";
};

export const isLikelyNoDataMessage = (value) => {
  const text = String(value || "").toLowerCase();
  return NO_DATA_HINTS.some((token) => text.includes(token));
};

export const getApiStatus = (error) => error?.response?.status;

export const extractApiMessage = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;

  if (data?.detail && typeof data.detail === "object") {
    if (typeof data.detail.message === "string") return data.detail.message;

    try {
      return JSON.stringify(data.detail);
    } catch {
      return fallback;
    }
  }

  if (typeof data?.message === "string") return data.message;
  if (typeof error?.message === "string") return error.message;

  return fallback;
};

export const toLocalDateKey = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const parseDateKey = (value) => {
  if (!value) return null;

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;

  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const clampDateKey = (value, min, max) => {
  if (!value) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const addDaysToKey = (value, days) => {
  const d = parseDateKey(value);
  if (!d) return value;

  d.setDate(d.getDate() + Number(days || 0));
  return toLocalDateKey(d);
};

export const getRangeLength = (start, end) => {
  const startDate = parseDateKey(start);
  const endDate = parseDateKey(end);
  if (!startDate || !endDate) return 0;

  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diff / 86400000) + 1);
};

export const getWeekStartKey = (value) => {
  const d = parseDateKey(value);
  if (!d) return value;

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  return toLocalDateKey(d);
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
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
};

export const fmtDate = (value, locale = "en") => {
  if (!value) return "—";

  const d = parseDateKey(value) || new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const fmtDateTime = (value, locale = "en") => {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString(locale === "ar" ? "ar" : "en");
};