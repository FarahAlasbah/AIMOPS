// frontend/src/features/data-upload/components/UploadsList.jsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import UploadCard from "./UploadCard";

export default function UploadsList({
  uploads,
  loading,
  limit,
  offset,
  hasNext,
  onPrev,
  onNext,
  hasLocalMapping,
  hasCachedAnalysis,
  onAnalyze,
  onReview,
  onRefreshAnalysis,
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
    return <div className="uploads-state">{t("uploadsList.loading")}</div>;
  }

  if (!uploads || uploads.length === 0) {
    return <div className="uploads-state">{t("uploadsList.empty")}</div>;
  }

  const page = Math.floor(offset / limit) + 1;

  return (
    <>
      <div className="uploads-grid">
        {uploads.map((u) => (
          <UploadCard
            key={u.batchId}
            upload={u}
            hasLocalMapping={hasLocalMapping(u.batchId)}
            hasCachedAnalysis={hasCachedAnalysis(u.batchId)}
            onAnalyze={onAnalyze}
            onReview={onReview}
            onRefreshAnalysis={onRefreshAnalysis}
            onClearLocal={onClearLocal}
            onDelete={onDelete}
            deleting={String(deletingId) === String(u.batchId)}
          />
        ))}
      </div>

      <div className="pager">
        <div className="pager-info">
          {t("uploadsList.pageInfo", { page, count: uploads.length })}
        </div>

        <div className="pager-actions">
          <button className="pager-btn" onClick={onPrev} disabled={offset === 0}>
            {t("uploadsList.prev")}
          </button>

          <div className="pager-page">
            {t("uploadsList.offsetInfo", { offset, limit })}
          </div>

          <button className="pager-btn" onClick={onNext} disabled={!hasNext}>
            {t("uploadsList.next")}
          </button>
        </div>
      </div>
    </>
  );
}