// frontend/src/features/data-upload/components/ColumnMeta.jsx
import { useTranslation } from "react-i18next";
import {
  boolText,
  formatConfidence,
  formatPercent,
  levelChipClass,
} from "../utils/analysisUtils";

export default function ColumnMeta({ column }) {
  const { t } = useTranslation("upload");

  if (!column) return null;

  const confidenceLevel = column.confidence_level || "-";
  const verify = !!column.verification_needed;

  const benefitLine =
    (column.benefit && `${t("columnMeta.benefit")}: ${column.benefit}`) ||
    (column.why && `${t("columnMeta.why")}: ${column.why}`) ||
    (column.reason && `${t("columnMeta.reason")}: ${column.reason}`) ||
    "-";

  return (
    <div style={{ marginTop: 10 }}>
      <div className="chip-row">
        <span className={`chip ${levelChipClass(confidenceLevel)}`}>
          {t("columnMeta.confidence")}:{" "}
          {formatConfidence(column.confidence)} ({confidenceLevel})
        </span>

        <span className="chip">
          {t("columnMeta.classification")}: {column.classification || "-"}
        </span>

        <span className={`chip ${verify ? "warn" : "good"}`}>
          {t("columnMeta.verificationNeeded")}: {boolText(verify)}
        </span>

        <span className="chip">
          {t("columnMeta.autoInclude")}: {boolText(!!column.auto_include)}
        </span>

        <span className={`chip ${column.can_skip ? "" : "warn"}`}>
          {t("columnMeta.canSkip")}: {boolText(!!column.can_skip)}
        </span>
      </div>

      <div className="meta-grid">
        <div className="meta-item">
          <div className="meta-label">{t("columnMeta.totalValues")}</div>
          <div className="meta-value">{column.total_values ?? "-"}</div>
        </div>

        <div className="meta-item">
          <div className="meta-label">{t("columnMeta.nonNullValues")}</div>
          <div className="meta-value">{column.non_null_values ?? "-"}</div>
        </div>

        <div className="meta-item">
          <div className="meta-label">{t("columnMeta.completeness")}</div>
          <div className="meta-value">
            {formatPercent(column.completeness)}
          </div>
        </div>

        <div className="meta-item" style={{ gridColumn: "1 / -1" }}>
          <div className="meta-label">
            {t("columnMeta.benefitWhyReason")}
          </div>
          <div className="meta-value" style={{ fontWeight: 500 }}>
            {benefitLine}
          </div>
        </div>
      </div>

      {Array.isArray(column.samples) && column.samples.length > 0 && (
        <div className="samples-box">
          <div className="samples-title">
            {t("columnMeta.samples")}
          </div>
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