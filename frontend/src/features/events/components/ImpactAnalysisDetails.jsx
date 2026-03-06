// frontend/src/features/events/components/ImpactAnalysisDetails.jsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./ImpactAnalysisDetails.css";

const fmtNum = (v, digits = 2) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(digits);
};

const fmtPct = (v, digits = 2) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  const s = n > 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}%`;
};

const pillClassImpact = (level) => {
  const v = String(level || "").toLowerCase();
  if (v === "very_high") return "impact-pill veryhigh";
  if (v === "high") return "impact-pill high";
  if (v === "medium") return "impact-pill medium";
  if (v === "low") return "impact-pill low";
  return "impact-pill neutral";
};

export default function ImpactAnalysisDetails({ analysis }) {
  const { t } = useTranslation("events");
  const [activeKey, setActiveKey] = useState("high_confidence");
  const [q, setQ] = useState("");

  const titleForBucket = (k) => {
    const key = String(k || "");
    const known = ["high_confidence", "low_confidence", "event_only", "below_threshold"];
    if (known.includes(key)) return t(`impact.buckets.${key}`);
    return key.replaceAll("_", " ");
  };

  const buckets = useMemo(() => {
    const raw = analysis?.products && typeof analysis.products === "object" ? analysis.products : {};
    const out = Object.entries(raw)
      .filter(([, arr]) => Array.isArray(arr))
      .map(([k, arr]) => ({ key: k, title: titleForBucket(k), items: arr }));

    const order = ["high_confidence", "low_confidence", "event_only", "below_threshold"];
    out.sort((a, b) => {
      const ia = order.indexOf(a.key);
      const ib = order.indexOf(b.key);
      if (ia === -1 && ib === -1) return a.key.localeCompare(b.key);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    if (!out.find((x) => x.key === activeKey) && out.length) {
      setActiveKey(out[0].key);
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  const active = useMemo(() => buckets.find((b) => b.key === activeKey) || buckets[0], [buckets, activeKey]);

  const filtered = useMemo(() => {
    const items = Array.isArray(active?.items) ? active.items : [];
    const needle = String(q || "").trim().toLowerCase();
    if (!needle) return items;
    return items.filter((p) => String(p?.product_name || "").toLowerCase().includes(needle));
  }, [active, q]);

  const eventPeriod = analysis?.event_period;
  const baselinePeriod = analysis?.baseline_period;
  const coverage = analysis?.data_coverage;
  const breakdown = analysis?.data_quality_breakdown;

  return (
    <div className="impact-details">
      <div className="impact-top">
        <div className="impact-kpi">
          <div className="impact-kpi-label">{t("impact.kpi.overallImpact")}</div>
          <div className="impact-kpi-value">{analysis?.overall_impact || "none"}</div>
        </div>

        <div className="impact-kpi">
          <div className="impact-kpi-label">{t("impact.kpi.affectedProducts")}</div>
          <div className="impact-kpi-value">{Number(analysis?.affected_products_count) || 0}</div>
        </div>

        <div className="impact-kpi">
          <div className="impact-kpi-label">{t("impact.kpi.batchesAnalyzed")}</div>
          <div className="impact-kpi-value">{Number(coverage?.batches_analyzed) || 0}</div>
        </div>

        <div className="impact-kpi">
          <div className="impact-kpi-label">{t("impact.kpi.coverageComplete")}</div>
          <div className="impact-kpi-value">
            {coverage?.coverage_complete ? t("impact.kpi.yes") : t("impact.kpi.no")}
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
                ? t("impact.eventPeriod.durationValue", { days: eventPeriod.duration_days })
                : "-"}
            </span>
          </div>
        </div>

        <div className="impact-box">
          <div className="impact-box-title">{t("impact.baselinePeriod.title")}</div>
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
                ? t("impact.baselinePeriod.durationValue", { days: baselinePeriod.duration_days })
                : "-"}
            </span>
          </div>
        </div>

        <div className="impact-box">
          <div className="impact-box-title">{t("impact.dataCoverage.title")}</div>
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
            {buckets.map((b) => (
              <button
                key={b.key}
                type="button"
                className={`impact-tab ${b.key === activeKey ? "active" : ""}`}
                onClick={() => setActiveKey(b.key)}
              >
                {b.title} <span className="impact-tab-count">({b.items.length})</span>
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
                <th style={{ width: "12%" }}>{t("impact.table.colBaselineAvg")}</th>
                <th style={{ width: "12%" }}>{t("impact.table.colDuringAvg")}</th>
                <th style={{ width: "12%" }}>{t("impact.table.colChange")}</th>
                <th style={{ width: "12%" }}>{t("impact.table.colImpact")}</th>
                <th style={{ width: "12%" }}>{t("impact.table.colCoverage")}</th>
                <th style={{ width: "14%" }}>{t("impact.table.colNotes")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={`${p.product_id}-${p.product_name}`}>
                  <td>
                    <div className="p-name">{p.product_name || "-"}</div>
                    <div className="p-sub mono">
                      {t("impact.table.productId", { id: p.product_id ?? "-" })}
                    </div>
                  </td>
                  <td className="mono">{fmtNum(p.baseline_daily_avg)}</td>
                  <td className="mono">{fmtNum(p.during_daily_avg)}</td>
                  <td className={`mono ${Number(p.change_percentage) < 0 ? "neg" : "pos"}`}>
                    {fmtPct(p.change_percentage)}
                  </td>
                  <td>
                    <span className={pillClassImpact(p.impact_level)}>
                      {p.impact_level || "-"}
                    </span>
                  </td>
                  <td className="mono">
                    {p.baseline_coverage_pct !== undefined && p.baseline_coverage_pct !== null
                      ? t("impact.table.coveragePct", { pct: fmtNum(p.baseline_coverage_pct, 0) })
                      : "-"}
                  </td>
                  <td>
                    <div className="p-note">
                      {p.note || "-"}
                      {p.confidence_improves_after ? (
                        <div className="p-sub mono">
                          {t("impact.table.improvesAfter", { date: p.confidence_improves_after })}
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