import {
  boolText,
  formatConfidence,
  formatPercent,
  levelChipClass,
} from "../utils/analysisUtils";

export default function ColumnMeta({ column }) {
  if (!column) return null;

  const confidenceLevel = column.confidence_level || "-";
  const verify = !!column.verification_needed;

  const benefitLine =
    (column.benefit && `Benefit: ${column.benefit}`) ||
    (column.why && `Why: ${column.why}`) ||
    (column.reason && `Reason: ${column.reason}`) ||
    "-";

  return (
    <div style={{ marginTop: 10 }}>
      <div className="chip-row">
        <span className={`chip ${levelChipClass(confidenceLevel)}`}>
          Confidence: {formatConfidence(column.confidence)} ({confidenceLevel})
        </span>

        <span className="chip">Classification: {column.classification || "-"}</span>

        <span className={`chip ${verify ? "warn" : "good"}`}>
          Verification needed: {boolText(verify)}
        </span>

        <span className="chip">Auto include: {boolText(!!column.auto_include)}</span>

        <span className={`chip ${column.can_skip ? "" : "warn"}`}>
          Can skip: {boolText(!!column.can_skip)}
        </span>
      </div>

      <div className="meta-grid">
        <div className="meta-item">
          <div className="meta-label">Total values</div>
          <div className="meta-value">{column.total_values ?? "-"}</div>
        </div>

        <div className="meta-item">
          <div className="meta-label">Non-null values</div>
          <div className="meta-value">{column.non_null_values ?? "-"}</div>
        </div>

        <div className="meta-item">
          <div className="meta-label">Completeness</div>
          <div className="meta-value">{formatPercent(column.completeness)}</div>
        </div>

        <div className="meta-item" style={{ gridColumn: "1 / -1" }}>
          <div className="meta-label">Benefit / Why / Reason</div>
          <div className="meta-value" style={{ fontWeight: 500 }}>
            {benefitLine}
          </div>
        </div>
      </div>

      {Array.isArray(column.samples) && column.samples.length > 0 && (
        <div className="samples-box">
          <div className="samples-title">Samples</div>
          <div className="samples-list">
            {column.samples.slice(0, 6).map((s, i) => (
              <span key={i}>
                {String(s)}
                {i < Math.min(column.samples.length, 6) - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
