// frontend/src/features/data-upload/utils/processPayload.js

export const buildProcessPayload = ({ analysis, columnMap }) => {
  const cols = analysis?.columns || [];

  const colNameByIndex = (idx) => {
    const c = cols.find((x) => String(x.index) === String(idx));
    return c?.name || "";
  };

  // Build { role -> index } from current UI
  const roleToIndex = {};
  Object.entries(columnMap || {}).forEach(([idx, st]) => {
    const role = st?.role;
    if (!role || role === "skip") return;
    roleToIndex[role] = idx;
  });

  // skip_columns = anything skipped OR not included
  const skip_columns = cols
    .filter((c) => {
      const st = columnMap?.[c.index];
      return st?.role === "skip" || st?.include === false;
    })
    .map((c) => c.name);

  return {
    date_column: colNameByIndex(roleToIndex.date),
    product_column: colNameByIndex(roleToIndex.product_name),
    quantity_column: colNameByIndex(roleToIndex.quantity),
    price_column: colNameByIndex(roleToIndex.unit_price),
    total_amount_column: colNameByIndex(roleToIndex.total_amount),
    category_column: colNameByIndex(roleToIndex.category),
    skip_columns,
  };
};
