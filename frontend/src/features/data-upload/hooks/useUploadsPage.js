// frontend/src/features/data-upload/hooks/useUploadsPage.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  deleteUploadBatch,
  getUploadsPage,
  uploadSalesData,
} from "../../../api/data";

import { MAX_MB, validateSelectedFile } from "../utils/fileUtils";

import {
  extractApiError,
  getExistingBatchIdFrom409,
} from "../utils/dataUploadErrorUtils";

import { isCompletedUploadStatus } from "../utils/dataUploadStatusUtils";

import {
  canOpenReviewForUpload,
  dedupeUploadsByBatch,
  extractOverlapWarning,
  normalizeSelectValue,
  normalizeUpload,
  UPLOADS_PAGE_LIMIT,
} from "../utils/uploadsPageUtils";

import { useDebouncedValue } from "./useDebouncedValue";

export function useUploadsPage(t) {
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(1);

  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);

  const sortOptions = useMemo(
    () => [
      { value: "newest", label: t("uploadsPage.sortNewest") },
      { value: "oldest", label: t("uploadsPage.sortOldest") },
      { value: "name_asc", label: t("uploadsPage.sortNameAsc") },
      { value: "name_desc", label: t("uploadsPage.sortNameDesc") },
      { value: "status", label: t("uploadsPage.sortStatus") },
    ],
    [t],
  );

  const fetchUploads = useCallback(
    async (nextOffset = 0) => {
      setUploadsLoading(true);
      setError("");

      try {
        const page = await getUploadsPage({
          limit: UPLOADS_PAGE_LIMIT,
          offset: nextOffset,
          search: debouncedSearchQuery,
          sortBy,
          dateFrom,
          dateTo,
        });

        const normalized = Array.isArray(page.items)
          ? page.items.map(normalizeUpload)
          : [];

        const nextUploads = dedupeUploadsByBatch(normalized);

        setUploads(nextUploads);
        setTotalCount(page.total ?? nextUploads.length);
        setHasNextPage(Boolean(page.hasNext));
      } catch (err) {
        setError(extractApiError(err, t("uploadsPage.errorLoadFailed")));
        setUploads([]);
        setTotalCount(0);
        setHasNextPage(false);
      } finally {
        setUploadsLoading(false);
      }
    },
    [dateFrom, dateTo, debouncedSearchQuery, sortBy, t],
  );

  useEffect(() => {
    fetchUploads(offset);
  }, [offset, fetchUploads]);

  useEffect(() => {
    setSelectedBatchIds([]);

    if (offset !== 0) {
      setOffset(0);
    }
  }, [sortBy, debouncedSearchQuery, dateFrom, dateTo]);

  const selectedBatchIdSet = useMemo(
    () => new Set(selectedBatchIds.map(String)),
    [selectedBatchIds],
  );

  const selectedUploads = useMemo(
    () =>
      uploads.filter((upload) =>
        selectedBatchIdSet.has(String(upload?.batchId ?? "")),
      ),
    [uploads, selectedBatchIdSet],
  );

  const selectedCount = selectedUploads.length;
  const isDeleting = deletingIds.size > 0;

  const showCompletedUploadWarning = useCallback(
    (fileName = "") => {
      setWarning(
        t("uploadsPage.completedUploadWarning", {
          fileName,
          defaultValue:
            "This upload is already finished. The products from this file were already added to AIMOPS.",
        }),
      );
    },
    [t],
  );

  const toggleSelectUpload = (batchId, checked) => {
    const id = String(batchId ?? "").trim();

    if (!id || isDeleting) return;

    setSelectedBatchIds((previous) => {
      const set = new Set(previous.map(String));

      if (checked) {
        set.add(id);
      } else {
        set.delete(id);
      }

      return Array.from(set);
    });
  };

  const toggleSelectVisible = (checked) => {
    if (isDeleting) return;

    const visibleIds = uploads
      .map((upload) => String(upload?.batchId ?? "").trim())
      .filter(Boolean);

    setSelectedBatchIds((previous) => {
      const set = new Set(previous.map(String));

      visibleIds.forEach((id) => {
        if (checked) {
          set.add(id);
        } else {
          set.delete(id);
        }
      });

      return Array.from(set);
    });
  };

  const clearSelection = () => {
    if (isDeleting) return;
    setSelectedBatchIds([]);
  };

  const handleFileSelect = (file) => {
    setError("");
    setWarning("");

    if (!file) {
      setUploadedFile(null);
      return;
    }

    const validation = validateSelectedFile(file, t);

    if (!validation.ok) {
      setUploadedFile(null);
      setError(validation.message);
      return;
    }

    setUploadedFile(file);
  };

  const resetUploadForm = () => {
    setUploadedFile(null);
    setError("");
    setProgress(0);
    setFileInputKey((key) => key + 1);
  };

  const handleUpload = async () => {
    setError("");
    setWarning("");

    if (!uploadedFile) {
      setError(t("uploadsPage.errorNoFile"));
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const uploadResponse = await uploadSalesData({
        file: uploadedFile,
        onProgress: setProgress,
      });

      const newBatchId = uploadResponse?.batch_id ?? uploadResponse?.batchId;
      const overlapWarning = extractOverlapWarning(uploadResponse, t);

      if (overlapWarning) {
        setWarning(overlapWarning);
      }

      setUploadedFile(null);
      setProgress(0);
      setFileInputKey((key) => key + 1);

      if (newBatchId) {
        navigate(`/app/data-upload/map/${newBatchId}`);
        return;
      }

      setOffset(0);
      await fetchUploads(0);
    } catch (err) {
      if (err?.response?.status === 409) {
        const existingId = getExistingBatchIdFrom409(err);
        const message = extractApiError(
          err,
          t("uploadsPage.errorUploadDuplicate", {
            defaultValue:
              "This file already exists in AIMOPS. You do not need to upload it again.",
          }),
        );

        setUploadedFile(null);
        setProgress(0);
        setFileInputKey((key) => key + 1);

        setWarning(
          existingId
            ? t("uploadsPage.duplicateUploadWarning", {
                defaultValue:
                  "This file already exists in AIMOPS. You do not need to upload it again.",
              })
            : message,
        );

        setOffset(0);
        await fetchUploads(0);
        return;
      }

      setError(extractApiError(err, t("uploadsPage.errorUploadFailed")));
    } finally {
      setUploading(false);
    }
  };

  const requestDelete = (upload) => {
    if (!upload?.batchId || isDeleting) return;

    setError("");
    setConfirmTarget({
      mode: "single",
      uploads: [upload],
    });
    setConfirmOpen(true);
  };

  const requestBulkDelete = () => {
    if (selectedUploads.length === 0 || isDeleting) return;

    setError("");
    setConfirmTarget({
      mode: "bulk",
      uploads: selectedUploads,
    });
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const confirmDelete = async () => {
    const targets = Array.isArray(confirmTarget?.uploads)
      ? confirmTarget.uploads
          .map((upload) => ({
            ...upload,
            batchId: upload?.batchId,
            fileName: upload?.fileName,
          }))
          .filter((upload) => upload.batchId != null)
      : [];

    if (targets.length === 0) return;

    const targetIds = targets.map((upload) => String(upload.batchId));
    const deletedIds = [];
    const failures = [];

    setError("");
    setDeletingIds(new Set(targetIds));

    try {
      for (const upload of targets) {
        try {
          await deleteUploadBatch(upload.batchId);
          deletedIds.push(String(upload.batchId));
        } catch (err) {
          failures.push({ upload, err });
        }
      }

      setSelectedBatchIds((previous) =>
        previous.filter((id) => !deletedIds.includes(String(id))),
      );

      closeConfirm();

      if (offset !== 0 && uploads.length === deletedIds.length) {
        setOffset((previous) => Math.max(0, previous - UPLOADS_PAGE_LIMIT));
      } else {
        await fetchUploads(offset);
      }

      if (failures.length > 0) {
        const baseMessage = extractApiError(
          failures[0]?.err,
          t("uploadsPage.errorDeleteFailed"),
        );

        const prefix =
          failures.length === targets.length
            ? t("uploadsPage.bulkDeleteFailed", {
                count: failures.length,
              })
            : t("uploadsPage.bulkDeletePartialFailed", {
                failed: failures.length,
                total: targets.length,
              });

        setError(`${prefix} ${baseMessage}`);
      }
    } finally {
      setDeletingIds(new Set());
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
  };

  const setSortByValue = (value) => {
    setSortBy(normalizeSelectValue(value));
  };

  const hasActiveFilters =
    !!searchQuery.trim() || !!dateFrom || !!dateTo || sortBy !== "newest";

  const isBulkConfirm = confirmTarget?.mode === "bulk";

  const confirmCount = Array.isArray(confirmTarget?.uploads)
    ? confirmTarget.uploads.length
    : 0;

  const confirmTitle = isBulkConfirm
    ? t("uploadsPage.bulkDeleteDialogTitle")
    : t("uploadsPage.deleteDialogTitle");

  const confirmText = isBulkConfirm
    ? t("uploadsPage.bulkDeleteDialogConfirm")
    : t("uploadsPage.deleteDialogConfirm");

  const confirmMessage = isBulkConfirm
    ? t("uploadsPage.bulkDeleteDialogMessage", {
        count: confirmCount,
      })
    : confirmTarget?.uploads?.[0]
      ? t("uploadsPage.deleteDialogMessage", {
          fileName: confirmTarget.uploads[0].fileName || t("uploadsPage.file"),
        })
      : "";

  return {
    error,
    warning,
    setWarning,
    showCompletedUploadWarning,

    uploadedFile,
    uploading,
    progress,
    fileInputKey,
    handleFileSelect,
    resetUploadForm,
    handleUpload,

    uploadsLoading,
    uploads,
    offset,
    totalCount,
    hasNextPage,
    fetchUploads,

    sortBy,
    setSortByValue,
    searchQuery,
    setSearchQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortOptions,
    clearFilters,
    hasActiveFilters,

    deletingIds,
    isDeleting,
    confirmOpen,
    confirmTitle,
    confirmText,
    confirmMessage,
    closeConfirm,
    confirmDelete,

    selectedBatchIdSet,
    selectedCount,
    toggleSelectUpload,
    toggleSelectVisible,
    clearSelection,
    requestDelete,
    requestBulkDelete,

    setOffset,

    canOpenReviewForUpload,
    isCompletedUploadStatus,
    navigate,
  };
}