// frontend/src/features/data-upload/components/UploadsList.jsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import UploadCard from "./UploadCard";
import { UploadsListSkeleton } from "./Skeletons";

export default function UploadsList({
  uploads,
  loading,
  limit,
  offset,
  totalCount,
  hasNext,
  onPrev,
  onNext,
  hasLocalMapping,
  hasCachedAnalysis,
  onOpenMapping,
  onReview,
  onClearLocal,
  onDelete,
  deletingId,
}) {
  const { t } = useTranslation("upload");

  useEffect(() => {
    if (!loading && Array.isArray(uploads) && uploads.length === 0 && offset > 0) {
      onPrev?.();
    }
  }, [loading, uploads, offset, onPrev]);

  if (loading) {
    return <UploadsListSkeleton count={6} />;
  }

  if (!uploads || uploads.length === 0) {
    return (
      <div className="uploads-state">
        {t("uploadsList.emptyFiltered", { defaultValue: "No uploads match the current filters." })}
      </div>
    );
  }

  const page = Math.floor(offset / limit) + 1;
  const from = totalCount > 0 ? offset + 1 : 0;
  const to = offset + uploads.length;

  return (
    <>
      <div className="uploads-grid">
        {uploads.map((u) => (
          <UploadCard
            key={u.batchId}
            upload={u}
            hasLocalMapping={hasLocalMapping(u.batchId)}
            hasCachedAnalysis={hasCachedAnalysis(u.batchId)}
            onOpenMapping={onOpenMapping}
            onReview={onReview}
            onClearLocal={onClearLocal}
            onDelete={onDelete}
            deleting={String(deletingId) === String(u.batchId)}
          />
        ))}
      </div>

      <div className="pager">
        <div className="pager-info">
          {t("uploadsList.pageInfoTotal", {
            page,
            total: totalCount,
            defaultValue: `Page ${page} • ${totalCount} uploads`,
          })}
        </div>

        <div className="pager-actions">
          <button className="pager-btn" onClick={onPrev} disabled={offset === 0}>
            {t("uploadsList.prev")}
          </button>

          <div className="pager-page">
            {t("uploadsList.rangeInfo", {
              from,
              to,
              total: totalCount,
              defaultValue: `Showing ${from}-${to} of ${totalCount}`,
            })}
          </div>

          <button className="pager-btn" onClick={onNext} disabled={!hasNext}>
            {t("uploadsList.next")}
          </button>
        </div>
      </div>
    </>
  );
}