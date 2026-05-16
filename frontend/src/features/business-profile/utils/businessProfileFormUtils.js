export const EMPTY_FORM = {
  business_name: "",
  industry: "",
  city: "",
};

export function normalizeForm(profile) {
  return {
    business_name: profile?.business_name || "",
    industry: profile?.industry || "",
    city: profile?.city || "",
  };
}

export function hasArabic(value) {
  return /[\u0600-\u06FF]/.test(String(value || ""));
}

export function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـ]/g, "");
}

export function getSuggestionText(option) {
  return [option.en, option.ar, ...(option.aliases || [])]
    .filter(Boolean)
    .map(normalizeSearch)
    .join(" ");
}

export function getMatches(value, options) {
  const query = normalizeSearch(value);

  if (!query) {
    return options.slice(0, 8);
  }

  return options
    .filter((option) => getSuggestionText(option).includes(query))
    .sort((a, b) => {
      const aText = getSuggestionText(a);
      const bText = getSuggestionText(b);

      const aStarts = aText.startsWith(query);
      const bStarts = bText.startsWith(query);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.en.localeCompare(b.en);
    })
    .slice(0, 8);
}

export function getPickedValue(option, currentInput) {
  return hasArabic(currentInput) ? option.ar : option.en;
}