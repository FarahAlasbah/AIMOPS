// frontend/src/features/events/components/ImpactAnalysisDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./ImpactAnalysisDetails.css";

const fmtNum = (value, digits = 2) => {
  const number = Number(value);
  if (Number.isNaN(number)) return "-";

  return number.toFixed(digits);
};

const fmtPct = (value, digits = 2) => {
  const number = Number(value);
  if (Number.isNaN(number)) return "-";

  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(digits)}%`;
};

const pillClassImpact = (level) => {
  const value = String(level || "").toLowerCase();

  if (value === "very_high") return "impact-pill veryhigh";
  if (value === "high") return "impact-pill high";
  if (value === "medium") return "impact-pill medium";
  if (value === "low") return "impact-pill low";

  return "impact-pill neutral";
};

const impactLevelLabel = (level, t) => {
  const value = String(level || "").toLowerCase();

  if (!value) return "-";

  return t(`impact.levels.${value}`, {
    defaultValue: String(level).replaceAll("_", " "),
  });
};

export default function ImpactAnalysisDetails({ analysis }) {
  const { t } = useTranslation("events");
  const [activeKey, setActiveKey] = useState("high_confidence");
  const [q, setQ] = useState("");

  const titleForBucket = (key) => {
    const value = String(key || "");
    const known = [
      "high_confidence",
      "low_confidence",
      "event_only",
      "below_threshold",
    ];

    if (known.includes(value)) return t(`impact.buckets.${value}`);

    return value.replaceAll("_", " ");
  };

  const buckets = useMemo(() => {
    const raw =
      analysis?.products && typeof analysis.products === "object"
        ? analysis.products
        : {};

    const output = Object.entries(raw)
      .filter(([, items]) => Array.isArray(items))
      .map(([key, items]) => ({
        key,
        title: titleForBucket(key),
        items,
      }));

    const order = [
      "high_confidence",
      "low_confidence",
      "event_only",
      "below_threshold",
    ];

    output.sort((a, b) => {
      const aIndex = order.indexOf(a.key);
      const bIndex = order.indexOf(b.key);

      if (aIndex === -1 && bIndex === -1) return a.key.localeCompare(b.key);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });

    return output;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, t]);

  useEffect(() => {
    if (!buckets.find((bucket) => bucket.key === activeKey) && buckets.length) {
      setActiveKey(buckets[0].key);
    }
  }, [activeKey, buckets]);

  const active = useMemo(
    () => buckets.find((bucket) => bucket.key === activeKey) || buckets[0],
    [buckets, activeKey],
  );

  const filtered = useMemo(() => {
    const items = Array.isArray(active?.items) ? active.items : [];
    const needle = String(q || "").trim().toLowerCase();

    if (!needle) return items;

    return items.filter((product) =>
      String(product?.product_name || "").toLowerCase().includes(needle),
    );
  }, [active, q]);

  const eventPeriod = analysis?.event_period;
  const baselinePeriod = analysis?.baseline_period;
  const coverage = analysis?.data_coverage;
  const breakdown = analysis?.data_quality_breakdown;

  return (
    <div className="impact-details">
      <div className="impact-top">
        <div className="impact-kpi">
          <div className="impact-kpi-label">
            {t("impact.kpi.overallImpact")}
          </div>

          <div className="impact-kpi-value">
            {impactLevelLabel(analysis?.overall_impact, t)}
          </div>
        </div>

        <div className="impact-kpi">
          <div className="impact-kpi-label">
            {t("impact.kpi.affectedProducts")}
          </div>

          <div className="impact-kpi-value">
            {Number(analysis?.affected_products_count) || 0}
          </div>
        </div>

        <div className="impact-kpi">
          <div className="impact-kpi-label">
            {t("impact.kpi.batchesAnalyzed")}
          </div>

          <div className="impact-kpi-value">
            {Number(coverage?.batches_analyzed) || 0}
          </div>
        </div>

        <div className="impact-kpi">
          <div className="impact-kpi-label">
            {t("impact.kpi.coverageComplete")}
          </div>

          <div className="impact-kpi-value">
            {coverage?.coverage_complete
              ? t("impact.kpi.yes")
              : t("impact.kpi.no")}
          </div>
        </div>
      </div>

      <div className="impact-grid">
        <div className="impact-box">
          <div className="impact-box-title">{t("impact.eventPeriod.title")}</div>

          <div className="impact-box-row">
            <span>{t("impact.eventPeriod.start")}</span>
            <span className="mono">{eventPeriod?.start || "-"}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.eventPeriod.end")}</span>
            <span className="mono">{eventPeriod?.end || "-"}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.eventPeriod.duration")}</span>
            <span>
              {Number(eventPeriod?.duration_days)
                ? t("impact.eventPeriod.durationValue", {
                    days: eventPeriod.duration_days,
                  })
                : "-"}
            </span>
          </div>
        </div>

        <div className="impact-box">
          <div className="impact-box-title">
            {t("impact.baselinePeriod.title")}
          </div>

          <div className="impact-box-row">
            <span>{t("impact.baselinePeriod.start")}</span>
            <span className="mono">{baselinePeriod?.start || "-"}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.baselinePeriod.end")}</span>
            <span className="mono">{baselinePeriod?.end || "-"}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.baselinePeriod.duration")}</span>
            <span>
              {Number(baselinePeriod?.duration_days)
                ? t("impact.baselinePeriod.durationValue", {
                    days: baselinePeriod.duration_days,
                  })
                : "-"}
            </span>
          </div>
        </div>

        <div className="impact-box">
          <div className="impact-box-title">
            {t("impact.dataCoverage.title")}
          </div>

          <div className="impact-box-row">
            <span>{t("impact.dataCoverage.earliestData")}</span>
            <span className="mono">{coverage?.earliest_data || "-"}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.dataCoverage.latestData")}</span>
            <span className="mono">{coverage?.latest_data || "-"}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.dataCoverage.batchesAnalyzed")}</span>
            <span>{Number(coverage?.batches_analyzed) || 0}</span>
          </div>
        </div>

        <div className="impact-box">
          <div className="impact-box-title">{t("impact.dataQuality.title")}</div>

          <div className="impact-box-row">
            <span>{t("impact.dataQuality.highConfidence")}</span>
            <span>{Number(breakdown?.high_confidence) || 0}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.dataQuality.lowConfidence")}</span>
            <span>{Number(breakdown?.low_confidence) || 0}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.dataQuality.eventOnly")}</span>
            <span>{Number(breakdown?.event_only) || 0}</span>
          </div>

          <div className="impact-box-row">
            <span>{t("impact.dataQuality.belowThreshold")}</span>
            <span>{Number(breakdown?.below_threshold) || 0}</span>
          </div>
        </div>
      </div>

      <div className="impact-products">
        <div className="impact-products-head">
          <div className="impact-tabs">
            {buckets.map((bucket) => (
              <button
                key={bucket.key}
                type="button"
                className={`impact-tab ${
                  bucket.key === activeKey ? "active" : ""
                }`}
                onClick={() => setActiveKey(bucket.key)}
              >
                {bucket.title}{" "}
                <span className="impact-tab-count">
                  ({bucket.items.length})
                </span>
              </button>
            ))}
          </div>

          <div className="impact-search">
            <input
              className="form-input"
              placeholder={t("impact.search.placeholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="impact-table-wrap">
          <table className="impact-table">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>{t("impact.table.colProduct")}</th>
                <th style={{ width: "12%" }}>
                  {t("impact.table.colBaselineAvg")}
                </th>
                <th style={{ width: "12%" }}>
                  {t("impact.table.colDuringAvg")}
                </th>
                <th style={{ width: "12%" }}>{t("impact.table.colChange")}</th>
                <th style={{ width: "12%" }}>{t("impact.table.colImpact")}</th>
                <th style={{ width: "12%" }}>{t("impact.table.colCoverage")}</th>
                <th style={{ width: "14%" }}>{t("impact.table.colNotes")}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((product) => (
                <tr key={`${product.product_id}-${product.product_name}`}>
                  <td>
                    <div className="p-name">{product.product_name || "-"}</div>

                    <div className="p-sub mono">
                      {t("impact.table.productId", {
                        id: product.product_id ?? "-",
                      })}
                    </div>
                  </td>

                  <td className="mono">{fmtNum(product.baseline_daily_avg)}</td>
                  <td className="mono">{fmtNum(product.during_daily_avg)}</td>

                  <td
                    className={`mono ${
                      Number(product.change_percentage) < 0 ? "neg" : "pos"
                    }`}
                  >
                    {fmtPct(product.change_percentage)}
                  </td>

                  <td>
                    <span className={pillClassImpact(product.impact_level)}>
                      {impactLevelLabel(product.impact_level, t)}
                    </span>
                  </td>

                  <td className="mono">
                    {product.baseline_coverage_pct !== undefined &&
                    product.baseline_coverage_pct !== null
                      ? t("impact.table.coveragePct", {
                          pct: fmtNum(product.baseline_coverage_pct, 0),
                        })
                      : "-"}
                  </td>

                  <td>
                    <div className="p-note">
                      {product.note || "-"}

                      {product.confidence_improves_after ? (
                        <div className="p-sub mono">
                          {t("impact.table.improvesAfter", {
                            date: product.confidence_improves_after,
                          })}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="impact-empty">
                    {t("impact.table.noProducts")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}