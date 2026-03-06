// frontend/src/features/data-upload/pages/UploadsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card, PageHeader, Button } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { uploadSalesData, getUploadsPage, deleteUploadBatch } from "../../../api/data";
import UploadStep from "../components/UploadStep";
import UploadsList from "../components/UploadsList";
import ConfirmDialog from "../components/ConfirmDialog";

import {
  MAX_MB,
  getFileKey,
  readDedupeSet,
  writeDedupeSet,
  validateSelectedFile,
  removeDedupeKeysForFileName,
} from "../utils/fileUtils";
import { getCachedAnalysis, clearCachedAnalysis } from "../utils/analysisCache";

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
const LS_EXTRACTED_PRODUCTS_KEY = (batchId) => `sales_extracted_products_v1_${batchId}`;
const LS_PRODUCTS_DRAFT_KEY = (batchId) => `sales_products_draft_v1_${batchId}`;
const LS_CONFIRMED_PRODUCTS_KEY = (batchId) => `sales_confirmed_products_v1_${batchId}`;

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
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const campaignOptions = useMemo(
    () => [
      { value: "1", label: "Summer Sale 2025" },
      { value: "2", label: "Ramadan Special" },
      { value: "3", label: "Back to School" },
    ],
    []
  );

  // Build the overlap warning string from an API response
  const extractOverlapWarning = (res) => {
    const warning =
      res?.overlap_warning ||
      res?.overlapWarning ||
      res?.warning ||
      res?.warnings ||
      "";

    if (typeof warning === "string" && warning.trim()) return warning.trim();

    const overlap =
      res?.overlap ||
      res?.overlapping_range ||
      res?.overlappingRange ||
      res?.dedupe ||
      res?.deduplication;

    const from = cleanStr(overlap?.from ?? overlap?.start ?? overlap?.from_date ?? overlap?.start_date);
    const to = cleanStr(overlap?.to ?? overlap?.end ?? overlap?.to_date ?? overlap?.end_date);
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
      const m = msg.toLowerCase();
      if (
        m.includes("overlap") ||
        m.includes("overlapping") ||
        m.includes("duplicate") ||
        m.includes("dedup") ||
        m.includes("replaced")
      ) {
        return msg;
      }
    }

    return "";
  };

  const fetchUploads = async ({ nextOffset } = {}) => {
    const off = typeof nextOffset === "number" ? nextOffset : offset;

    setUploadsLoading(true);
    setError("");
    try {
      const res = await getUploadsPage({ limit, offset: off });
      const list = Array.isArray(res) ? res.map(normalizeUpload) : [];

      list.sort((a, b) =>
        String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || ""))
      );
      setUploads(list);
      setHasNext(list.length === limit);
    } catch (e) {
      setError(extractApiError(e, t("uploadsPage.errorLoadFailed")));
      setUploads([]);
      setHasNext(false);
    } finally {
      setUploadsLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads({ nextOffset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      const res = await uploadSalesData({
        file: uploadedFile,
        campaignId: selectedCampaign || undefined,
        onProgress: setProgress,
      });

      const overlapWarning = extractOverlapWarning(res);
      if (overlapWarning) setWarning(overlapWarning);

      const dedupe = readDedupeSet();
      dedupe.add(getFileKey(uploadedFile));
      writeDedupeSet(dedupe);

      await fetchUploads({ nextOffset: 0 });
      setOffset(0);

      setUploadedFile(null);
      setProgress(0);
      setFileInputKey((k) => k + 1);
    } catch (err) {
      if (err?.response?.status === 409) {
        const existingId = getExistingBatchIdFrom409(err);
        const msg = extractApiError(err, t("uploadsPage.errorUploadDuplicate"));

        try {
          const dedupe = readDedupeSet();
          dedupe.add(getFileKey(uploadedFile));
          writeDedupeSet(dedupe);
        } catch {}

        await fetchUploads({ nextOffset: 0 });
        setOffset(0);

        setUploadedFile(null);
        setProgress(0);
        setFileInputKey((k) => k + 1);

        if (existingId) {
          navigate(`/app/data-upload/map/${existingId}`);
          return;
        }

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
    if (!upload?.batchId) return;
    setError("");
    setConfirmTarget(upload);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const confirmDelete = async () => {
    const upload = confirmTarget;
    const id = upload?.batchId;
    if (id == null) return;

    setError("");

    try {
      setDeletingId(id);

      await deleteUploadBatch(id);

      clearLocalForBatch(id);
      removeDedupeKeysForFileName(upload?.fileName);

      closeConfirm();

      await fetchUploads({ nextOffset: 0 });
      setOffset(0);
    } catch (err) {
      setError(extractApiError(err, t("uploadsPage.errorDeleteFailed")));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmMsg = confirmTarget
    ? t("uploadsPage.deleteDialogMessage", {
        fileName: confirmTarget.fileName || "file",
      })
    : "";

  return (
    <div className="data-upload-page">
      <PageHeader
        title={t("uploadsPage.title")}
        breadcrumbs={[
          {
            label: t("uploadsPage.breadcrumbRoot"),
            link: true,
            onClick: () => navigate("/app/campaigns"),
          },
          { label: t("uploadsPage.breadcrumbCurrent"), link: false },
        ]}
      />

      <Card>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        )}

        {warning && (
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
        )}

        <UploadStep
          campaignOptions={campaignOptions}
          selectedCampaign={selectedCampaign}
          onCampaignChange={(e) => setSelectedCampaign(e.target.value)}
          onFileSelect={handleFileSelect}
          uploading={uploading}
          progress={progress}
          maxMb={MAX_MB}
          onCancel={() => {
            setUploadedFile(null);
            setError("");
            setProgress(0);
            setFileInputKey((k) => k + 1);
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
            <Button
              variant="secondary"
              onClick={() => fetchUploads({ nextOffset: offset })}
              disabled={uploadsLoading || deletingId != null}
            >
              {uploadsLoading ? t("uploadsPage.refreshing") : t("uploadsPage.refresh")}
            </Button>
          </div>

          <UploadsList
            uploads={uploads}
            loading={uploadsLoading}
            limit={limit}
            offset={offset}
            hasNext={hasNext}
            onPrev={() => {
              const nextOff = Math.max(0, offset - limit);
              setOffset(nextOff);
              fetchUploads({ nextOffset: nextOff });
            }}
            onNext={() => {
              const nextOff = offset + limit;
              setOffset(nextOff);
              fetchUploads({ nextOffset: nextOff });
            }}
            hasLocalMapping={hasLocalMapping}
            hasCachedAnalysis={hasCachedAnalysis}
            onAnalyze={(id) => navigate(`/app/data-upload/map/${id}`)}
            onReview={(id) => navigate(`/app/data-upload/review/${id}`)}
            onRefreshAnalysis={(id) => navigate(`/app/data-upload/map/${id}?refresh=1`)}
            onClearLocal={clearLocalForBatch}
            onDelete={requestDelete}
            deletingId={deletingId}
          />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={t("uploadsPage.deleteDialogTitle")}
        message={confirmMsg}
        cancelText={t("uploadsPage.deleteDialogCancel")}
        confirmText={t("uploadsPage.deleteDialogConfirm")}
        busy={deletingId != null}
        onCancel={() => {
          if (deletingId != null) return;
          closeConfirm();
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}