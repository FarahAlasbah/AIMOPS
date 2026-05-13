// frontend/src/features/data-upload/utils/analysisUtils.js

const formatPercent = (n) => {
  const x = Number(n);
  if (Number.isNaN(x)) return "-";
  return `${x.toFixed(0)}%`;
};

const formatConfidence = (n) => {
  const x = Number(n);
  if (Number.isNaN(x)) return "-";
  return `${Math.round(x * 100)}%`;
};

const levelChipClass = (level) => {
  const v = String(level || "").toLowerCase();
  if (v === "high") return "good";
  if (v === "medium") return "warn";
  if (v === "low") return "bad";
  return "";
};

const boolText = (v, t) => {
  if (typeof t === "function") {
    return v
      ? t("common.yes", { defaultValue: "Yes" })
      : t("common.no", { defaultValue: "No" });
  }

  return v ? "Yes" : "No";
};

/**
 * Roles allowed in the UI.
 * Keep the English label as a fallback only.
 */
export const ROLE_DEFS = [
  { value: "date", label: "Date", labelKey: "roles.date" },
  { value: "product_name", label: "Product name", labelKey: "roles.product_name" },
  { value: "quantity", label: "Quantity", labelKey: "roles.quantity" },
  { value: "unit_price", label: "Unit price", labelKey: "roles.unit_price" },
  { value: "total_amount", label: "Total amount", labelKey: "roles.total_amount" },
  { value: "category", label: "Category", labelKey: "roles.category" },
  { value: "product_code", label: "Product code", labelKey: "roles.product_code" },
  { value: "discount", label: "Discount", labelKey: "roles.discount" },
  { value: "customer_id", label: "Customer ID", labelKey: "roles.customer_id" },
  { value: "location", label: "Location", labelKey: "roles.location" },
  { value: "payment_method", label: "Payment method", labelKey: "roles.payment_method" },
  { value: "skip", label: "Skip", labelKey: "roles.skip" },
];

const ROLE_LABEL = ROLE_DEFS.reduce((acc, r) => {
  acc[r.value] = r.label;
  return acc;
}, {});

const ALLOWED_ROLE_VALUES = new Set(ROLE_DEFS.map((r) => r.value));

/**
 * Normalize any backend role into something the UI supports.
 * Unsupported roles are skipped instead of being sent to the backend.
 */
export const normalizeRole = (role) => {
  const v = String(role || "").trim();
  if (!v) return "skip";
  return ALLOWED_ROLE_VALUES.has(v) ? v : "skip";
};

export const roleLabel = (role, t) => {
  const normalized = normalizeRole(role);
  const fallback = ROLE_LABEL[normalized] || ROLE_LABEL.skip || "Skip";

  if (typeof t === "function") {
    return t(`roles.${normalized}`, { defaultValue: fallback });
  }

  return fallback;
};

export const buildRoleOptions = (column, t) => {
  const suggested = normalizeRole(column?.role);
  const alternatives = Array.isArray(column?.alternative_roles)
    ? column.alternative_roles
    : [];

  const preferred = [suggested, ...alternatives.map(normalizeRole)].filter(Boolean);

  const values = [...preferred, ...ROLE_DEFS.map((r) => r.value)].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  return values.map((v) => ({ value: v, label: roleLabel(v, t) }));
};

export { formatPercent, formatConfidence, levelChipClass, boolText };