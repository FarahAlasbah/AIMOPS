// frontend/src/features/data-upload/utils/confirmPayload.js
import { normalizeRole } from "./analysisUtils";

const ALLOWED_ROLES = new Set([
  "date",
  "product_code",
  "product_name",
  "category",
  "quantity",
  "unit_price",
  "total_amount",
  "discount",
  "customer_id",
  "location",
  "payment_method",
  "skip", // used only internally; we do NOT send it
]);

export const buildConfirmMappingsPayload = ({ analysis, columnMap }) => {
  const cols = analysis?.columns || [];

  const mappings = cols
    .map((c) => {
      const st = columnMap?.[c.index];
      if (!st) return null;

      const role = normalizeRole(st.role);
      const include = st.include !== false && role !== "skip";

      if (!include) return null;

      // final safety
      if (!ALLOWED_ROLES.has(role) || role === "skip") return null;

      return { original_name: c.name, role };
    })
    .filter(Boolean);

  return { mappings };
};
