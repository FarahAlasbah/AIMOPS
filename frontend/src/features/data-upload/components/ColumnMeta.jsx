// frontend/src/features/data-upload/components/ColumnMeta.jsx
import { useTranslation } from "react-i18next";
import { formatConfidence, levelChipClass } from "../utils/analysisUtils";

export default function ColumnMeta({ column, showConfidence = true }) {
  const { t } = useTranslation("upload");

  if (!column) return null;

  const confidenceLevel = column.confidence_level || "-";
  const hasSamples = Array.isArray(column.samples) && column.samples.length > 0;

  const benefitLine =
    (column.benefit && `${t("columnMeta.benefit")}: ${column.benefit}`) ||
    (column.why && `${t("columnMeta.why")}: ${column.why}`) ||
    (column.reason && `${t("columnMeta.reason")}: ${column.reason}`) ||
    "";

  if (!hasSamples && !benefitLine && !showConfidence) return null;

  return (
    <div className="column-meta-clean">
      {hasSamples && (
        <div className="samples-box">
          <div className="samples-title">{t("columnMeta.samples")}</div>

          <div className="samples-list">
            {column.samples.slice(0, 6).map((sample, index) => (
              <span key={`${sample}-${index}`}>
                {String(sample)}
                {index < Math.min(column.samples.length, 6) - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {benefitLine && (
        <div className="benefit-box">
          <div className="benefit-title">
            {t("columnMeta.benefitWhyReason")}
          </div>

          <div className="benefit-text">{benefitLine}</div>
        </div>
      )}

      {showConfidence && (
        <div className="confidence-mini-row">
          <span className={`confidence-mini ${levelChipClass(confidenceLevel)}`}>
            {t("columnMeta.confidence", { defaultValue: "Confidence" })}:{" "}
            {formatConfidence(column.confidence)} ({confidenceLevel})
          </span>
        </div>
      )}
    </div>
  );
}