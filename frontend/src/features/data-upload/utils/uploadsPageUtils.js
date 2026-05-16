import { cleanStr } from "./dataUploadErrorUtils";
import {
  isCompletedUploadStatus,
  isReviewUploadStatus,
} from "./dataUploadStatusUtils";

export const UPLOADS_PAGE_LIMIT = 20;

export const normalizeUpload = (upload) => ({
  batchId: upload?.batch_id ?? upload?.batchId,
  fileName: upload?.file_name ?? upload?.fileName,
  fileType: upload?.file_type ?? upload?.fileType,
  fileSizeKb: upload?.file_size_kb ?? upload?.fileSizeKb,
  status: upload?.status,
  uploadedAt: upload?.uploaded_at ?? upload?.uploadedAt,
  validRows: upload?.valid_rows ?? upload?.validRows,
  rejectedRows: upload?.rejected_rows ?? upload?.rejectedRows,

  confirmedMappingsCount:
    upload?.confirmed_mappings_count ??
    upload?.confirmedMappingsCount ??
    upload?.mappings_count ??
    upload?.mappingsCount ??
    null,

  productCount:
    upload?.product_count ??
    upload?.products_count ??
    upload?.productCount ??
    upload?.productsCount ??
    null,
});

export const dedupeUploadsByBatch = (list) => {
  const seen = new Set();

  return list.filter((upload) => {
    const id = String(upload?.batchId ?? "").trim();
    if (!id || seen.has(id)) return false;

    seen.add(id);
    return true;
  });
};

export const normalizeSelectValue = (value) => {
  if (value?.target?.value != null) return value.target.value;
  if (value?.value != null) return value.value;
  return value;
};

export const canOpenReviewForUpload = (upload) => {
  if (!upload) return false;

  if (isCompletedUploadStatus(upload.status)) return false;
  if (isReviewUploadStatus(upload.status)) return true;

  const mappingsCount = Number(upload.confirmedMappingsCount);
  if (Number.isFinite(mappingsCount) && mappingsCount > 0) return true;

  const productCount = Number(upload.productCount);
  if (Number.isFinite(productCount) && productCount > 0) return true;

  return false;
};

export const extractOverlapWarning = (response, t) => {
  const warningMessage =
    response?.overlap_warning ||
    response?.overlapWarning ||
    response?.warning ||
    response?.warnings ||
    "";

  if (typeof warningMessage === "string" && warningMessage.trim()) {
    return warningMessage.trim();
  }

  const overlap =
    response?.overlap ||
    response?.overlapping_range ||
    response?.overlappingRange ||
    response?.dedupe ||
    response?.deduplication;

  const from = cleanStr(
    overlap?.from ??
      overlap?.start ??
      overlap?.from_date ??
      overlap?.start_date,
  );

  const to = cleanStr(
    overlap?.to ?? overlap?.end ?? overlap?.to_date ?? overlap?.end_date,
  );

  const deleted =
    overlap?.deleted_rows ??
    overlap?.deletedRows ??
    overlap?.replaced_rows ??
    overlap?.replacedRows;

  if (from && to) {
    return deleted != null && deleted !== ""
      ? t("uploadsPage.overlapWarningWithRows", { from, to, deleted })
      : t("uploadsPage.overlapWarning", { from, to });
  }

  const message = cleanStr(response?.message);

  if (!message) return "";

  const lower = message.toLowerCase();

  if (
    lower.includes("overlap") ||
    lower.includes("overlapping") ||
    lower.includes("duplicate") ||
    lower.includes("dedup") ||
    lower.includes("replaced")
  ) {
    return message;
  }

  return "";
};