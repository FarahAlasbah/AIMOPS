import { normalizeRole } from "./analysisUtils";
import { extractApiError } from "./dataUploadErrorUtils";
import {
  isCompletedUploadStatus,
  isMappingConfirmedStatus,
} from "./dataUploadStatusUtils";

export const isCompletedAnalyzeError = (err) => {
  const message = extractApiError(err, "");
  const lower = String(message || "").toLowerCase();

  return (
    lower.includes("batch already completed") ||
    lower.includes("cannot re-analyze")
  );
};

export const isBackendFileTypeError = (err) => {
  const message = extractApiError(err, "");
  const lower = String(message || "").toLowerCase();

  return (
    lower.includes("failed to detect file type") ||
    lower.includes("utf-8") ||
    lower.includes("codec can't decode")
  );
};

export const getFriendlyMappingError = (err, fallback, t) => {
  if (isBackendFileTypeError(err)) {
    return t("mappingPage.friendlyFileTypeError", {
      defaultValue: fallback,
    });
  }

  if (isCompletedAnalyzeError(err)) {
    return t("mappingPage.friendlyCompletedError", {
      defaultValue: fallback,
    });
  }

  return extractApiError(err, fallback);
};

export const isCompletedUploadDetails = (details, analysisResult) => {
  const completedByStatus = isCompletedUploadStatus(details?.status);
  const completedByAnalyzeError =
    analysisResult?.status === "rejected" &&
    isCompletedAnalyzeError(analysisResult.reason);

  return completedByStatus || completedByAnalyzeError;
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
      role: normalizeRole(
        mapping?.role ?? mapping?.mapped_role ?? mapping?.mappedRole,
      ),
    }))
    .filter(
      (mapping) =>
        mapping.original_name && mapping.role && mapping.role !== "skip",
    );
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

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.products)) return raw.products;

  return [];
};

export const buildConfirmResultFromDetails = (details) => {
  if (!details) return null;

  const confirmedMappings = extractConfirmedMappingsFromDetails(details);
  const products = extractProductsFromDetails(details);
  const statusConfirmed = isMappingConfirmedStatus(details.status);

  if (!statusConfirmed && confirmedMappings.length === 0 && products.length === 0) {
    return null;
  }

  return {
    success: true,
    confirmed_mappings: confirmedMappings,
    products,
  };
};

export const normalizeAnalysisResponse = (raw) => {
  if (!raw) return null;

  const rawColumns = Array.isArray(raw.columns) ? raw.columns : [];

  const columns = rawColumns.map((column) => {
    const role = normalizeRole(column.suggested_role ?? column.role ?? "skip");
    const confidenceLevel = String(
      column.confidence_level ?? "",
    ).toLowerCase();

    const confidence =
      typeof column.confidence === "number" ? column.confidence : 0;

    const verificationNeeded =
      column.verification_needed != null
        ? !!column.verification_needed
        : confidenceLevel === "medium";

    const autoInclude =
      column.auto_include != null
        ? !!column.auto_include
        : role !== "skip" &&
          (confidenceLevel === "high" || confidenceLevel === "medium");

    const classification = column.classification ?? "optional";
    const canSkip = classification !== "required";

    return {
      ...column,
      role,
      suggested_role: column.suggested_role ?? role,
      confidence,
      confidence_level: column.confidence_level ?? "low",
      verification_needed: verificationNeeded,
      auto_include: autoInclude,
      can_skip: canSkip,
      non_null_values: column.non_null_values ?? column.total_values ?? null,
      total_values: column.total_values ?? null,
      completeness: column.completeness ?? null,
      benefit: column.benefit ?? column.why ?? column.reason ?? null,
      why: column.why ?? null,
      reason: column.reason ?? null,
      samples: Array.isArray(column.samples) ? column.samples : [],
      user_prompt: column.display_hint ?? column.user_prompt ?? null,
    };
  });

  const highConfidence = columns.filter(
    (column) =>
      String(column.confidence_level ?? "").toLowerCase() === "high" &&
      !column.verification_needed &&
      normalizeRole(column.role) !== "skip",
  );

  const needsVerification = columns.filter(
    (column) => column.verification_needed,
  );

  const needsMapping = columns.filter(
    (column) =>
      !column.verification_needed &&
      String(column.confidence_level ?? "").toLowerCase() === "low" &&
      normalizeRole(column.role) === "skip",
  );

  const suggestedSkip = columns.filter(
    (column) =>
      !column.verification_needed &&
      normalizeRole(column.role) === "skip" &&
      String(column.confidence_level ?? "").toLowerCase() !== "low",
  );

  const rawRequiredMissing = Array.isArray(raw.required_missing)
    ? raw.required_missing
    : [];

  const requiredMissing = rawRequiredMissing
    .map((required) => ({
      role: required.role ?? required.required_role ?? "",
      name: required.name ?? required.label ?? required.role ?? "",
      user_prompt: required.user_prompt ?? required.display_hint ?? null,
    }))
    .filter((required) => required.role);

  return {
    ...raw,
    columns,
    classified: {
      high_confidence: highConfidence,
      needs_verification: needsVerification,
      needs_mapping: needsMapping,
      required_missing: requiredMissing,
      suggested_skip: suggestedSkip,
    },
  };
};

export const extractConfirmedMappingsList = (confirmResult) => {
  const raw =
    confirmResult?.confirmed_mappings ||
    confirmResult?.mappings ||
    confirmResult?.confirmedMappings ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((mapping) => ({
      original_name:
        mapping?.original_name ?? mapping?.originalName ?? mapping?.name ?? "",
      role: normalizeRole(mapping?.role),
    }))
    .filter((mapping) => mapping.original_name && mapping.role);
};

export const buildBaseColumnMapFromAnalysis = (analysis) => {
  const initial = {};

  (analysis?.columns || []).forEach((column) => {
    const role = normalizeRole(column.role);

    initial[column.index] = {
      role,
      include: role !== "skip" && !!column.auto_include,
      verified: !column.verification_needed,
    };
  });

  return initial;
};

export const buildRequiredMissingInit = (analysis) => {
  const requiredMissingMap = {};

  (analysis?.classified?.required_missing || []).forEach((required) => {
    requiredMissingMap[required.role] = "";
  });

  return requiredMissingMap;
};

export const buildColumnMapFromConfirmed = (analysis, confirmResult, baseMap) => {
  const confirmedList = extractConfirmedMappingsList(confirmResult);

  if (confirmedList.length === 0) {
    const locked = {};

    Object.entries(baseMap || {}).forEach(([index, state]) => {
      locked[index] = {
        ...state,
        verified: true,
      };
    });

    return locked;
  }

  const byName = new Map(
    confirmedList.map((mapping) => [
      String(mapping.original_name),
      normalizeRole(mapping.role),
    ]),
  );

  const next = {};

  (analysis?.columns || []).forEach((column) => {
    const mappedRole = byName.get(String(column.name));
    const role = normalizeRole(mappedRole || "skip");

    next[column.index] = {
      role,
      include: role !== "skip",
      verified: true,
    };
  });

  return next;
};

export const buildRequiredMissingFromColumnMap = (analysis, columnMap) => {
  const requiredMissingMap = buildRequiredMissingInit(analysis);
  const requiredMissing = analysis?.classified?.required_missing || [];

  requiredMissing.forEach((required) => {
    const requiredRole = normalizeRole(required.role);

    const found = Object.entries(columnMap || {}).find(
      ([, state]) => normalizeRole(state?.role) === requiredRole,
    );

    if (found) {
      requiredMissingMap[required.role] = String(found[0]);
    }
  });

  return requiredMissingMap;
};