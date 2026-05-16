export const safeArr = (value) => (Array.isArray(value) ? value : []);

export const cleanStr = (value) => String(value ?? "").trim();

export const uniq = (arr) => Array.from(new Set(arr));

export const getSelectedMerges = (productsDraft, normalizedName) => {
  const key = cleanStr(normalizedName);
  if (!key) return [];

  const found = safeArr(productsDraft).find(
    (item) => cleanStr(item?.normalized_name) === key,
  );

  return uniq(safeArr(found?.merge_with).map(cleanStr).filter(Boolean));
};