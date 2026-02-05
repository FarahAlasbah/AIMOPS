import { useEffect, useMemo, useState } from "react";
import UploadCard from "./UploadCard";

export default function UploadsList({
  uploads,
  hasLocalMapping,
  hasCachedAnalysis,
  onAnalyze,
  onReview,
  onRefreshAnalysis,
  onClearLocal,
}) {
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const total = Array.isArray(uploads) ? uploads.length : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const list = Array.isArray(uploads) ? uploads : [];
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [uploads, page]);

  if (!uploads || uploads.length === 0) {
    return <div style={{ marginTop: 14, color: "#6b7280", fontSize: 13 }}>No uploads yet.</div>;
  }

  const startN = (page - 1) * pageSize + 1;
  const endN = Math.min(page * pageSize, total);

  return (
    <>
      <div className="uploads-grid">
        {paged.map((u) => (
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
          Showing {startN}-{endN} of {total}
        </div>

        <div className="pager-actions">
          <button className="pager-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Prev
          </button>

          <div className="pager-page">
            Page {page} / {totalPages}
          </div>

          <button
            className="pager-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
