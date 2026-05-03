// frontend/src/features/data-upload/components/UploadsList.jsx
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import UploadRow from "./UploadCard";

function SelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !!indeterminate && !checked;
    }
  }, [checked, indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="ul-checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
      aria-label={label}
    />
  );
}

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
  deletingIds,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectVisible,
  selectionDisabled = false,
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

  const selectedSet = useMemo(() => {
    if (selectedIds instanceof Set) return selectedIds;
    return new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String));
  }, [selectedIds]);

  const deletingSet = useMemo(() => {
    if (deletingIds instanceof Set) return deletingIds;
    return new Set();
  }, [deletingIds]);

  const visibleIds = useMemo(
    () =>
      (Array.isArray(uploads) ? uploads : [])
        .map((u) => String(u?.batchId ?? "").trim())
        .filter(Boolean),
    [uploads],
  );

  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedSet.has(id),
  ).length;

  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const someVisibleSelected =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;

  const isDeletingUpload = (id) => {
    const sid = String(id ?? "");
    return deletingSet.has(sid) || String(deletingId ?? "") === sid;
  };

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

  const from = totalCount > 0 ? offset + 1 : 0;
  const to = offset + uploads.length;

  return (
    <>
      <div className="ul-table">
        <div className="ul-header">
          <div className="ul-select-cell">
            <SelectAllCheckbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              disabled={selectionDisabled || visibleIds.length === 0}
              onChange={onToggleSelectVisible}
              label={t("uploadsList.selectVisible", {
                defaultValue: "Select visible uploads",
              })}
            />
          </div>

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
              hasCachedAnalysis={hasCachedAnalysis?.(u.batchId)}
              onOpenMapping={onOpenMapping}
              onReview={onReview}
              onClearLocal={onClearLocal}
              onDelete={onDelete}
              deleting={isDeletingUpload(u.batchId)}
              selected={selectedSet.has(String(u.batchId))}
              onSelectChange={onToggleSelect}
              selectionDisabled={selectionDisabled}
            />
          ))}
        </div>
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
            type="button"
            className="ul-pager-btn"
            onClick={onPrev}
            disabled={offset === 0}
          >
            {t("uploadsList.prev")}
          </button>

          <button
            type="button"
            className="ul-pager-btn"
            onClick={onNext}
            disabled={!hasNext}
          >
            {t("uploadsList.next")}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Skeleton ── */
function UploadsGridSkeleton({ count = 6 }) {
  return (
    <div className="ul-table">
      <div className="ul-list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="ul-row ul-row--skeleton" />
        ))}
      </div>
    </div>
  );
}