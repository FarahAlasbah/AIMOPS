// frontend/src/features/data-upload/components/UploadsList.jsx
import { useEffect } from "react";
import UploadCard from "./UploadCard";
import { UploadsListSkeleton } from "./Skeletons";

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
}) {
  useEffect(() => {
    if (!loading && Array.isArray(uploads) && uploads.length === 0 && offset > 0) {
      onPrev?.();
    }
  }, [loading, uploads, offset, onPrev]);

  if (loading) {
    return <UploadsListSkeleton count={6} />;
  }

  if (!uploads || uploads.length === 0) {
    return <div className="uploads-state">No uploads yet.</div>;
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
          />
        ))}
      </div>

      <div className="pager">
        <div className="pager-info">
          Page {page} • Showing {uploads.length} item(s)
        </div>

        <div className="pager-actions">
          <button className="pager-btn" onClick={onPrev} disabled={offset === 0}>
            Prev
          </button>

          <div className="pager-page">
            Offset {offset} • Limit {limit}
          </div>

          <button className="pager-btn" onClick={onNext} disabled={!hasNext}>
            Next
          </button>
        </div>
      </div>
    </>
  );
}
