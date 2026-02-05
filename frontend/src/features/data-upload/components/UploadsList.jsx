import UploadCard from "./UploadCard";

export default function UploadsList({
  uploads,
  hasLocalMapping,
  hasCachedAnalysis,
  onAnalyze,
  onReview,
  onRefreshAnalysis,
  onDelete,
}) {
  if (!uploads || uploads.length === 0) {
    return <div style={{ marginTop: 14, color: "#6b7280", fontSize: 13 }}>No uploads yet.</div>;
  }

  return (
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
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
