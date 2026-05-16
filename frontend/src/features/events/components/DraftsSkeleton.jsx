export default function DraftsSkeleton() {
  return (
    <div className="drafts-skeleton">
      {[0, 1, 2].map((index) => (
        <div key={index} className="drafts-sk-row">
          <div className="drafts-sk-cell drafts-sk-check" />
          <div className="drafts-sk-cell drafts-sk-wide" />
          <div className="drafts-sk-cell drafts-sk-mid" />
          <div className="drafts-sk-cell drafts-sk-short" />
          <div className="drafts-sk-cell drafts-sk-short" />
          <div className="drafts-sk-cell drafts-sk-btn" />
        </div>
      ))}
    </div>
  );
}