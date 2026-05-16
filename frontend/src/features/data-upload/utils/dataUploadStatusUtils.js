const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

export const COMPLETED_UPLOAD_STATUSES = [
  "processed",
  "done",
  "success",
  "completed",
  "confirmed",
  "imported",
];

export const REVIEW_UPLOAD_STATUSES = [
  "mapped",
  "mapping_confirmed",
  "mappings_confirmed",
  "products_pending",
  "products_ready",
  "review",
  "review_required",
];

export const MAPPING_CONFIRMED_STATUSES = [
  ...REVIEW_UPLOAD_STATUSES,
  ...COMPLETED_UPLOAD_STATUSES,
];

export const isCompletedUploadStatus = (status) =>
  COMPLETED_UPLOAD_STATUSES.includes(normalizeStatus(status));

export const isReviewUploadStatus = (status) =>
  REVIEW_UPLOAD_STATUSES.includes(normalizeStatus(status));

export const isMappingConfirmedStatus = (status) =>
  MAPPING_CONFIRMED_STATUSES.includes(normalizeStatus(status));