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
  "skip",
]);

function getFinalRole(column, state) {
  const selectedRole = normalizeRole(state?.role);
  const suggestedRole = normalizeRole(column?.role ?? column?.suggested_role);

  if (selectedRole) return selectedRole;
  if (suggestedRole) return suggestedRole;

  return "skip";
}

export const buildConfirmMappingsPayload = ({ analysis, columnMap }) => {
  const cols = Array.isArray(analysis?.columns) ? analysis.columns : [];

  const mappings = cols
    .map((column) => {
      const state = columnMap?.[column.index];

      let role = getFinalRole(column, state);

      const manuallyExcluded = state?.include === false;
      if (manuallyExcluded) {
        role = "skip";
      }

      if (!ALLOWED_ROLES.has(role)) {
        role = "skip";
      }

      return {
        original_name: column.name,
        role,
      };
    })
    .filter((mapping) => mapping.original_name);

  return { mappings };
};