import { isMappingConfirmedStatus } from "./dataUploadStatusUtils";

export const safeArr = (value) => (Array.isArray(value) ? value : []);

export const normalizeProduct = (product) => ({
  primary_name: String(
    product?.primary_name ??
      product?.primaryName ??
      product?.product_name ??
      product?.productName ??
      product?.name ??
      "",
  ).trim(),

  normalized_name: String(
    product?.normalized_name ??
      product?.normalizedName ??
      product?.primary_name ??
      product?.product_name ??
      product?.name ??
      "",
  ).trim(),

  category:
    product?.category == null ? null : String(product.category).trim() || null,

  possible_typos: Array.isArray(product?.possible_typos)
    ? product.possible_typos
    : Array.isArray(product?.possibleTypos)
      ? product.possibleTypos
      : [],
});

export const extractProductsFromValue = (value) => {
  const raw = Array.isArray(value?.products)
    ? value.products
    : Array.isArray(value)
      ? value
      : [];

  return raw
    .map(normalizeProduct)
    .filter((product) => product.primary_name && product.normalized_name);
};

export const extractProductsFromMappingResult = (confirmResult) => {
  const raw =
    confirmResult?.products?.products ||
    confirmResult?.products ||
    confirmResult?.extracted_products ||
    confirmResult?.extractedProducts ||
    [];

  return extractProductsFromValue(raw);
};

export const extractProductsFromDetails = (details) => {
  const raw =
    details?.products ||
    details?.extracted_products ||
    details?.extractedProducts ||
    details?.product_candidates ||
    details?.productCandidates ||
    details?.confirmed_products ||
    details?.confirmedProducts ||
    details?.mapping_result?.products ||
    details?.mappingResult?.products ||
    [];

  return extractProductsFromValue(raw);
};

export const extractConfirmedMappingsFromDetails = (details) => {
  const raw =
    details?.confirmed_mappings ||
    details?.confirmedMappings ||
    details?.mappings ||
    details?.column_mappings ||
    details?.columnMappings ||
    details?.mapping?.mappings ||
    details?.mapping?.confirmed_mappings ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((mapping) => ({
      original_name:
        mapping?.original_name ??
        mapping?.originalName ??
        mapping?.column_name ??
        mapping?.columnName ??
        mapping?.name ??
        "",
      role: mapping?.role ?? mapping?.mapped_role ?? mapping?.mappedRole ?? "",
    }))
    .filter((mapping) => mapping.original_name && mapping.role);
};

export const buildConfirmResultFromDetails = (details) => {
  if (!details) return null;

  const mappings = extractConfirmedMappingsFromDetails(details);
  const products = extractProductsFromDetails(details);

  if (
    !isMappingConfirmedStatus(details.status) &&
    mappings.length === 0 &&
    products.length === 0
  ) {
    return null;
  }

  return {
    success: true,
    confirmed_mappings: mappings,
    products,
  };
};

export const buildDraftMap = (productsDraft) => {
  const map = new Map();

  safeArr(productsDraft).forEach((product) => {
    const key = String(product?.normalized_name || "").trim();

    if (!key) return;

    const mergeWith = Array.from(
      new Set(
        safeArr(product?.merge_with)
          .map((value) => String(value).trim())
          .filter(Boolean),
      ),
    );

    map.set(key, mergeWith);
  });

  return map;
};

export const initDraftFromProducts = (products) =>
  safeArr(products).map((product) => ({
    normalized_name: product.normalized_name,
    merge_with: [],
  }));