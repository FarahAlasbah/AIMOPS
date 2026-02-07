// frontend/src/features/data-upload/utils/analysisUtils.js

const formatPercent = (n) => {
  const x = Number(n);
  if (Number.isNaN(x)) return "-";
  return `${x.toFixed(0)}%`;
};

const formatConfidence = (n) => {
  const x = Number(n);
  if (Number.isNaN(x)) return "-";
  return `${Math.round(x * 100)}%`; // backend sends 0..1
};

const levelChipClass = (level) => {
  const v = String(level || "").toLowerCase();
  if (v === "high") return "good";
  if (v === "medium") return "warn";
  if (v === "low") return "bad";
  return "";
};

const boolText = (v) => (v ? "Yes" : "No");

/**
 * Roles allowed in the UI (NO employee_id, NO other)
 */
export const ROLE_DEFS = [
  { value: "date", label: "Date" },
  { value: "product_name", label: "Product name" },
  { value: "quantity", label: "Quantity" },
  { value: "unit_price", label: "Unit price" },
  { value: "total_amount", label: "Total amount" },
  { value: "category", label: "Category" },
  { value: "product_code", label: "Product code" },
  { value: "discount", label: "Discount" },
  { value: "customer_id", label: "Customer ID" },
  { value: "location", label: "Location" },
  { value: "payment_method", label: "Payment method" },
  { value: "skip", label: "Skip" },
];

const ROLE_LABEL = ROLE_DEFS.reduce((acc, r) => {
  acc[r.value] = r.label;
  return acc;
}, {});

export const roleLabel = (role) => ROLE_LABEL[String(role || "")] || "Skip";

const ALLOWED_ROLE_VALUES = new Set(ROLE_DEFS.map((r) => r.value));

/**
 * Normalize any backend role into something the UI supports.
 * - employee_id -> skip
 * - other/unknown -> skip
 */
export const normalizeRole = (role) => {
  const v = String(role || "").trim();
  if (!v) return "skip";
  return ALLOWED_ROLE_VALUES.has(v) ? v : "skip";
};

/**
 * Backwards-compatible helper (if any code still calls it).
 * We no longer build dropdown options; we just return the allowed roles,
 * and we normalize suggested role into skip when it’s unsupported.
 */
export const buildRoleOptions = (column) => {
  const suggested = normalizeRole(column?.role);
  const alternatives = Array.isArray(column?.alternative_roles) ? column.alternative_roles : [];

  const preferred = [suggested, ...alternatives.map(normalizeRole)].filter(Boolean);

  const values = [...preferred, ...ROLE_DEFS.map((r) => r.value)].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  return values.map((v) => ({ value: v, label: roleLabel(v) }));
};

export { formatPercent, formatConfidence, levelChipClass, boolText };
