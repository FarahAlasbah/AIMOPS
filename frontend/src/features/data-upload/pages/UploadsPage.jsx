import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, Card, FormSelect, PageHeader } from "../../../shared/components";
import FormCalendar from "../../../shared/components/FormCalendar";
import InfoMessage from "../../../shared/components/InfoMessage";
import PageHelp from "../../../shared/components/PageHelp";
import {
  deleteUploadBatch,
  getUploadsPage,
  uploadSalesData,
} from "../../../api/data";
import ConfirmDialog from "../components/ConfirmDialog";
import UploadStep from "../components/UploadStep";
import UploadsList from "../components/UploadsList";
import {
  MAX_MB,
  getFileKey,
  readDedupeSet,
  removeDedupeKeysForFileName,
  validateSelectedFile,
  writeDedupeSet,
} from "../utils/fileUtils";
import { clearCachedAnalysis, getCachedAnalysis } from "../utils/analysisCache";

import "../components/UploadCard.css";

const LIMIT = 20;

const normalizeUpload = (u) => ({
  batchId: u?.batch_id ?? u?.batchId,
  fileName: u?.file_name ?? u?.fileName,
  fileType: u?.file_type ?? u?.fileType,
  fileSizeKb: u?.file_size_kb ?? u?.fileSizeKb,
  status: u?.status,
  uploadedAt: u?.uploaded_at ?? u?.uploadedAt,
  validRows: u?.valid_rows ?? u?.validRows,
  rejectedRows: u?.rejected_rows ?? u?.rejectedRows,
});

const LS_CONFIRMED_KEY = (batchId) => `sales_confirmed_mappings_v1_${batchId}`;
const LS_MAPPING_DRAFT_KEY = (batchId) => `sales_mapping_draft_v1_${batchId}`;
const LS_EXTRACTED_PRODUCTS_KEY = (batchId) =>
  `sales_extracted_products_v1_${batchId}`;
const LS_PRODUCTS_DRAFT_KEY = (batchId) => `sales_products_draft_v1_${batchId}`;
const LS_CONFIRMED_PRODUCTS_KEY = (batchId) =>
  `sales_confirmed_products_v1_${batchId}`;

const extractApiError = (err, fallback) => {
  const data = err?.response?.data;

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((d) => {
        const loc = Array.isArray(d?.loc) ? d.loc.join(".") : "";
        const msg = d?.msg || "Invalid input";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join(" | ");
  }

  if (typeof data?.detail === "string") return data.detail;

  if (data?.detail && typeof data.detail === "object") {
    if (typeof data.detail.message === "string") return data.detail.message;

    try {
      return JSON.stringify(data.detail);
    } catch {
      return fallback;
    }
  }

  if (typeof data?.message === "string") return data.message;
  if (typeof err?.message === "string") return err.message;

  return fallback;
};

const getExistingBatchIdFrom409 = (err) => {
  const id = err?.response?.data?.detail?.existing_batch?.batch_id;
  return typeof id === "number" || typeof id === "string" ? String(id) : "";
};

const cleanStr = (v) => String(v ?? "").trim();

const dedupeUploadsByBatch = (list) => {
  const seen = new Set();

  return list.filter((u) => {
    const id = String(u?.batchId ?? "").trim();
    if (!id || seen.has(id)) return false;

    seen.add(id);
    return true;
  });
};

function normalizeSelectValue(value) {
  if (value?.target?.value != null) return value.target.value;
  if (value?.value != null) return value.value;
  return value;
}

function useDebouncedValue(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function UploadsPage() {
  const { t } = useTranslation("upload");
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");

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

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);

  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const [selectedBatchIds, setSelectedBatchIds] = useState([]);

  const campaignOptions = useMemo(
    () => [
      { value: "1", label: "Summer Sale 2025" },
      { value: "2", label: "Ramadan Special" },
      { value: "3", label: "Back to School" },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      {
        value: "newest",
        label: t("uploadsPage.sortNewest", {
          defaultValue: "Newest first",
        }),
      },
      {
        value: "oldest",
        label: t("uploadsPage.sortOldest", {
          defaultValue: "Oldest first",
        }),
      },
      {
        value: "name_asc",
        label: t("uploadsPage.sortNameAsc", {
          defaultValue: "File name A–Z",
        }),
      },
      {
        value: "name_desc",
        label: t("uploadsPage.sortNameDesc", {
          defaultValue: "File name Z–A",
        }),
      },
      {
        value: "status",
        label: t("uploadsPage.sortStatus", {
          defaultValue: "Status",
        }),
      },
    ],
    [t],
  );

  const extractOverlapWarning = (res) => {
    const warningMessage =
      res?.overlap_warning ||
      res?.overlapWarning ||
      res?.warning ||
      res?.warnings ||
      "";

    if (typeof warningMessage === "string" && warningMessage.trim()) {
      return warningMessage.trim();
    }

    const overlap =
      res?.overlap ||
      res?.overlapping_range ||
      res?.overlappingRange ||
      res?.dedupe ||
      res?.deduplication;

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

    const msg = cleanStr(res?.message);

    if (msg) {
      const lower = msg.toLowerCase();

      if (
        lower.includes("overlap") ||
        lower.includes("overlapping") ||
        lower.includes("duplicate") ||
        lower.includes("dedup") ||
        lower.includes("replaced")
      ) {
        return msg;
      }
    }

    return "";
  };

  const fetchUploads = useCallback(
    async (nextOffset = offset) => {
      setUploadsLoading(true);
      setError("");

      try {
        const page = await getUploadsPage({
          limit: LIMIT,
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
      } catch (e) {
        setError(extractApiError(e, t("uploadsPage.errorLoadFailed")));
        setUploads([]);
        setTotalCount(0);
        setHasNextPage(false);
      } finally {
        setUploadsLoading(false);
      }
    },
    [dateFrom, dateTo, debouncedSearchQuery, offset, sortBy, t],
  );

  useEffect(() => {
    fetchUploads(offset);
  }, [offset, fetchUploads]);

  useEffect(() => {
    setSelectedBatchIds([]);

    if (offset !== 0) {
      setOffset(0);
    }
  }, [sortBy, debouncedSearchQuery, dateFrom, dateTo, offset]);

  const selectedBatchIdSet = useMemo(
    () => new Set(selectedBatchIds.map(String)),
    [selectedBatchIds],
  );

  const selectedUploads = useMemo(
    () =>
      uploads.filter((u) =>
        selectedBatchIdSet.has(String(u?.batchId ?? "")),
      ),
    [uploads, selectedBatchIdSet],
  );

  const selectedCount = selectedUploads.length;
  const isDeleting = deletingIds.size > 0;
  const hasNext = hasNextPage;

  const toggleSelectUpload = (batchId, checked) => {
    const id = String(batchId ?? "").trim();
    if (!id || isDeleting) return;

    setSelectedBatchIds((prev) => {
      const set = new Set(prev.map(String));

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
      .map((u) => String(u?.batchId ?? "").trim())
      .filter(Boolean);

    setSelectedBatchIds((prev) => {
      const set = new Set(prev.map(String));

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

    if (!file) {
      setUploadedFile(null);
      return;
    }

    const validation = validateSelectedFile(file);

    if (!validation.ok) {
      setUploadedFile(null);
      setError(validation.message);
      return;
    }

    const fileKey = getFileKey(file);
    const dedupe = readDedupeSet();

    if (dedupe.has(fileKey)) {
      setUploadedFile(null);
      setError(t("uploadsPage.errorDuplicateFile"));
      return;
    }

    setUploadedFile(file);
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

      const uploadRes = await uploadSalesData({
        file: uploadedFile,
        campaignId: selectedCampaign || undefined,
        onProgress: setProgress,
      });

      const dedupe = readDedupeSet();
      dedupe.add(getFileKey(uploadedFile));
      writeDedupeSet(dedupe);

      const newBatchId = uploadRes?.batch_id ?? uploadRes?.batchId;

      const overlapWarning = extractOverlapWarning(uploadRes);
      if (overlapWarning) setWarning(overlapWarning);

      if (newBatchId) {
        navigate(`/app/data-upload/map/${newBatchId}`);
        return;
      }

      setOffset(0);
      await fetchUploads(0);

      setUploadedFile(null);
      setProgress(0);
      setFileInputKey((key) => key + 1);
    } catch (err) {
      if (err?.response?.status === 409) {
        const existingId = getExistingBatchIdFrom409(err);
        const msg = extractApiError(err, t("uploadsPage.errorUploadDuplicate"));

        try {
          const dedupe = readDedupeSet();
          dedupe.add(getFileKey(uploadedFile));
          writeDedupeSet(dedupe);
        } catch {}

        setUploadedFile(null);
        setProgress(0);
        setFileInputKey((key) => key + 1);

        if (existingId) {
          navigate(`/app/data-upload/map/${existingId}`);
          return;
        }

        setOffset(0);
        await fetchUploads(0);
        setError(msg);
        return;
      }

      setError(extractApiError(err, t("uploadsPage.errorUploadFailed")));
    } finally {
      setUploading(false);
    }
  };

  const hasLocalMapping = (batchId) => {
    try {
      return !!localStorage.getItem(LS_CONFIRMED_KEY(batchId));
    } catch {
      return false;
    }
  };

  const hasCachedAnalysis = (batchId) => !!getCachedAnalysis(batchId);

  const clearLocalForBatch = (batchId) => {
    clearCachedAnalysis(batchId);

    try {
      localStorage.removeItem(LS_CONFIRMED_KEY(batchId));
      localStorage.removeItem(LS_MAPPING_DRAFT_KEY(batchId));
      localStorage.removeItem(LS_EXTRACTED_PRODUCTS_KEY(batchId));
      localStorage.removeItem(LS_PRODUCTS_DRAFT_KEY(batchId));
      localStorage.removeItem(LS_CONFIRMED_PRODUCTS_KEY(batchId));
    } catch {}
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
          .map((u) => ({
            ...u,
            batchId: u?.batchId,
            fileName: u?.fileName,
          }))
          .filter((u) => u.batchId != null)
      : [];

    if (targets.length === 0) return;

    const targetIds = targets.map((u) => String(u.batchId));
    const deletedIds = [];
    const failures = [];

    setError("");
    setDeletingIds(new Set(targetIds));

    try {
      for (const upload of targets) {
        try {
          await deleteUploadBatch(upload.batchId);

          clearLocalForBatch(upload.batchId);
          removeDedupeKeysForFileName(upload?.fileName);

          deletedIds.push(String(upload.batchId));
        } catch (err) {
          failures.push({ upload, err });
        }
      }

      setSelectedBatchIds((prev) =>
        prev.filter((id) => !deletedIds.includes(String(id))),
      );

      closeConfirm();

      if (offset !== 0 && uploads.length === deletedIds.length) {
        setOffset((prev) => Math.max(0, prev - LIMIT));
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
                defaultValue: `Could not delete ${failures.length} selected upload(s).`,
              })
            : t("uploadsPage.bulkDeletePartialFailed", {
                failed: failures.length,
                total: targets.length,
                defaultValue: `${failures.length} of ${targets.length} selected upload(s) could not be deleted.`,
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

  const hasActiveFilters =
    !!searchQuery.trim() || !!dateFrom || !!dateTo || sortBy !== "newest";

  const isBulkConfirm = confirmTarget?.mode === "bulk";
  const confirmCount = Array.isArray(confirmTarget?.uploads)
    ? confirmTarget.uploads.length
    : 0;

  const confirmTitle = isBulkConfirm
    ? t("uploadsPage.bulkDeleteDialogTitle", {
        defaultValue: "Delete selected uploads?",
      })
    : t("uploadsPage.deleteDialogTitle");

  const confirmText = isBulkConfirm
    ? t("uploadsPage.bulkDeleteDialogConfirm", {
        defaultValue: "Delete selected",
      })
    : t("uploadsPage.deleteDialogConfirm");

  const confirmMsg = isBulkConfirm
    ? t("uploadsPage.bulkDeleteDialogMessage", {
        count: confirmCount,
        defaultValue: `Delete ${confirmCount} selected upload(s)? This will also remove their saved mapping and review cache.`,
      })
    : confirmTarget?.uploads?.[0]
    ? t("uploadsPage.deleteDialogMessage", {
        fileName: confirmTarget.uploads[0].fileName || "file",
      })
    : "";

  return (
    <div className="data-upload-page">
      <PageHeader
        actions={
          <PageHelp
            title="How to use Data Upload"
            items={[
              {
                title: "1. Upload a sales file",
                description:
                  "Choose a CSV or Excel file that contains sales data such as date, product name, quantity, price, and total amount.",
              },
              {
                title: "2. Check previous uploads",
                description:
                  "Use the uploads table to find older files, filter by date, search by file name, or sort by status.",
              },
              {
                title: "3. Continue the workflow",
                description:
                  "Click an uploaded file to continue mapping columns or reviewing extracted products depending on its progress.",
              },
              {
                title: "4. Delete carefully",
                description:
                  "Deleting an upload also removes its saved mapping and review cache from the browser.",
              },
            ]}
            note="Tip: If a report or forecast is empty, make sure your sales data was uploaded and fully processed first."
          />
        }
      />

      <Card>
        {error ? (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        ) : null}

        {warning ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: "1 1 auto" }}>
                <InfoMessage type="warn">{warning}</InfoMessage>
              </div>

              <button
                type="button"
                className="ghost-btn"
                onClick={() => setWarning("")}
                style={{ whiteSpace: "nowrap" }}
              >
                {t("uploadsPage.dismiss")}
              </button>
            </div>
          </div>
        ) : null}

        <UploadStep
          campaignOptions={campaignOptions}
          selectedCampaign={selectedCampaign}
          onCampaignChange={(event) =>
            setSelectedCampaign(normalizeSelectValue(event))
          }
          onFileSelect={handleFileSelect}
          uploading={uploading}
          progress={progress}
          maxMb={MAX_MB}
          onCancel={() => {
            setUploadedFile(null);
            setError("");
            setProgress(0);
            setFileInputKey((key) => key + 1);
          }}
          onUpload={handleUpload}
          fileInputKey={fileInputKey}
          canUpload={!!uploadedFile}
          selectedFile={uploadedFile}
        />

        <div style={{ marginTop: 18 }}>
          <div className="uploads-header">
            <div style={{ fontWeight: 800, color: "#111827" }}>
              {t("uploadsPage.uploadsHeader")}
            </div>

            <div className="uploads-header-actions">
              <Button
                variant="secondary"
                onClick={() => fetchUploads(offset)}
                disabled={uploadsLoading || isDeleting}
              >
                {uploadsLoading
                  ? t("uploadsPage.refreshing")
                  : t("uploadsPage.refresh")}
              </Button>
            </div>
          </div>

          <div className="uploads-tools">
            <div className="uploads-field uploads-field-search">
              <label htmlFor="uploads-search" className="uploads-label">
                {t("uploadsPage.searchLabel", {
                  defaultValue: "Search file name",
                })}
              </label>

              <input
                id="uploads-search"
                className="uploads-input"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("uploadsPage.searchPlaceholder", {
                  defaultValue: "Search by file name...",
                })}
                disabled={uploadsLoading}
              />
            </div>

            <div className="uploads-field">
              <FormCalendar
                label={t("uploadsPage.dateFrom", { defaultValue: "From" })}
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                max={dateTo || undefined}
                disabled={uploadsLoading}
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div className="uploads-field">
              <FormCalendar
                label={t("uploadsPage.dateTo", { defaultValue: "To" })}
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                min={dateFrom || undefined}
                disabled={uploadsLoading}
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div className="uploads-field">
              <FormSelect
                label={t("uploadsPage.sortBy", { defaultValue: "Sort by" })}
                value={sortBy}
                onChange={(event) => setSortBy(normalizeSelectValue(event))}
                options={sortOptions}
                disabled={uploadsLoading || isDeleting}
              />
            </div>

            <div className="uploads-tools-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={clearFilters}
                disabled={!hasActiveFilters || uploadsLoading}
              >
                {t("uploadsPage.clearFilters", {
                  defaultValue: "Clear filters",
                })}
              </button>
            </div>
          </div>

          {selectedCount > 0 ? (
            <div className="uploads-selection-bar">
              <div className="uploads-selection-text">
                {t("uploadsPage.selectedUploads", {
                  count: selectedCount,
                  defaultValue: `${selectedCount} selected`,
                })}
              </div>

              <div className="uploads-selection-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={clearSelection}
                  disabled={isDeleting}
                >
                  {t("uploadsPage.clearSelection", {
                    defaultValue: "Clear selection",
                  })}
                </button>

                <button
                  type="button"
                  className="ghost-btn danger"
                  onClick={requestBulkDelete}
                  disabled={isDeleting}
                >
                  {t("uploadsPage.deleteSelected", {
                    count: selectedCount,
                    defaultValue: `Delete selected (${selectedCount})`,
                  })}
                </button>
              </div>
            </div>
          ) : null}

          <UploadsList
            uploads={uploads}
            loading={uploadsLoading}
            limit={LIMIT}
            offset={offset}
            totalCount={totalCount}
            hasNext={hasNext}
            onPrev={() => setOffset((prev) => Math.max(0, prev - LIMIT))}
            onNext={() => setOffset((prev) => prev + LIMIT)}
            hasLocalMapping={hasLocalMapping}
            hasCachedAnalysis={hasCachedAnalysis}
            onOpenMapping={(id) => navigate(`/app/data-upload/map/${id}`)}
            onReview={(id) => navigate(`/app/data-upload/review/${id}`)}
            onClearLocal={clearLocalForBatch}
            onDelete={requestDelete}
            deletingIds={deletingIds}
            selectedIds={selectedBatchIdSet}
            onToggleSelect={toggleSelectUpload}
            onToggleSelectVisible={toggleSelectVisible}
            selectionDisabled={isDeleting}
          />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMsg}
        cancelText={t("uploadsPage.deleteDialogCancel")}
        confirmText={confirmText}
        busy={isDeleting}
        onCancel={() => {
          if (isDeleting) return;
          closeConfirm();
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}