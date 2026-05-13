// frontend/src/features/products/utils/formatters.js

const getLocale = (language) => {
  if (String(language || "").startsWith("ar")) return "ar";
  return undefined;
};

export const money = (n, language) => {
  const x = Number(n ?? 0);

  if (Number.isNaN(x)) return "-";

  return new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits: 2,
  }).format(x);
};

export const dateText = (value, language) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(getLocale(language), {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};