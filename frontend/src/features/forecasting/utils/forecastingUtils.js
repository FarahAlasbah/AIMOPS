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
  const v = String(value || "").toLowerCase();

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