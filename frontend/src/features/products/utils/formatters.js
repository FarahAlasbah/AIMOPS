// frontend/src/features/products/utils/formatters.js

export const money = (n) => {
  const x = Number(n ?? 0);
  if (Number.isNaN(x)) return "-";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(x);
};

export const dateText = (v) => (v ? String(v) : "-");
