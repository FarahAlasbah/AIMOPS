// frontend/src/features/data-upload/components/UploadsList.jsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import UploadRow from "./UploadCard";
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
    if (
      !loading &&
      Array.isArray(uploads) &&
      uploads.length === 0 &&
      offset > 0
    ) {
      onPrev?.();
    }
  }, [loading, uploads, offset, onPrev]);

  if (loading) {
    return <UploadsGridSkeleton />;
  }

  if (!uploads || uploads.length === 0) {
    return (
      <div className="ul-empty">
        {t("uploadsList.emptyFiltered", {
          defaultValue: "No uploads match the current filters.",
        })}
      </div>
    );
  }

  const page = Math.floor(offset / limit) + 1;
  const from = totalCount > 0 ? offset + 1 : 0;
  const to = offset + uploads.length;

  return (
    <>
    <div className="ul-header">
  <div>{t("uploadsList.fileName", { defaultValue: "File name" })}</div>
  <div>{t("uploadsList.status", { defaultValue: "Status" })}</div>
  <div></div>
</div>
      <div className="ul-list">
        {uploads.map((u) => (
          <UploadRow
            key={u.batchId}
            upload={u}
            hasLocalMapping={hasLocalMapping(u.batchId)}
            onOpenMapping={onOpenMapping}
            onReview={onReview}
            onDelete={onDelete}
            deleting={String(deletingId) === String(u.batchId)}
          />
        ))}
      </div>

      <div className="ul-pager">
        <span className="ul-pager-info">
          {t("uploadsList.rangeInfo", {
            from,
            to,
            total: totalCount,
            defaultValue: `Showing ${from}–${to} of ${totalCount}`,
          })}
        </span>
        <div className="ul-pager-btns">
          <button
            className="ul-pager-btn"
            onClick={onPrev}
            disabled={offset === 0}
          >
            {t("uploadsList.prev")}
          </button>
          <button className="ul-pager-btn" onClick={onNext} disabled={!hasNext}>
            {t("uploadsList.next")}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Skeleton ── */
function CardSkeleton() {
  return (
    <div className="uc-card uc-card--skeleton">
      <div className="uc-top">
        <div className="sk sk-icon" />
        <div className="uc-identity">
          <div className="sk sk-line" style={{ width: "65%", height: 13 }} />
          <div
            className="sk sk-line"
            style={{ width: "40%", height: 11, marginTop: 5 }}
          />
        </div>
      </div>
      <div className="uc-mid">
        <div className="sk sk-pill" style={{ width: 80, height: 22 }} />
        <div style={{ display: "flex", gap: 16 }}>
          <div className="sk sk-line" style={{ width: 48, height: 13 }} />
          <div className="sk sk-line" style={{ width: 48, height: 13 }} />
        </div>
      </div>
      <div className="uc-actions">
        <div className="sk sk-btn" style={{ width: 90, height: 30 }} />
        <div className="sk sk-btn" style={{ width: 72, height: 30 }} />
      </div>
    </div>
  );
}

function UploadsGridSkeleton({ count = 6 }) {
  return (
    <div className="ul-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ul-row ul-row--skeleton" />
      ))}
    </div>
  );
}