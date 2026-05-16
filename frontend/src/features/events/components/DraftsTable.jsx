import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getDraftImpactMeta, normalizeId } from "../utils/eventsPageUtils";

export default function DraftsTable({
  drafts,
  selectedIds,
  dismissingIds,
  onToggleOne,
  onToggleAll,
  onReview,
}) {
  const { t } = useTranslation("events");

  const selectedSet = useMemo(
    () => new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String)),
    [selectedIds],
  );

  const dismissingSet = useMemo(
    () =>
      new Set((Array.isArray(dismissingIds) ? dismissingIds : []).map(String)),
    [dismissingIds],
  );

  const visibleIds = drafts
    .map((draft) => normalizeId(draft.event_id))
    .filter(Boolean);

  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedSet.has(id),
  ).length;

  const allSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const someSelected =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;

  return (
    <div className="drafts-table-wrap">
      <table className="drafts-table">
        <thead>
          <tr>
            <th style={{ width: "44px" }}>
              <input
                type="checkbox"
                className="drafts-checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={(e) => onToggleAll?.(e.target.checked)}
                aria-label={t("draftsTable.selectAll")}
              />
            </th>

            <th style={{ width: "28%" }}>{t("draftsTable.colPeriod")}</th>
            <th style={{ width: "24%" }}>{t("draftsTable.colProducts")}</th>
            <th style={{ width: "16%" }}>{t("draftsTable.colImpact")}</th>
            <th style={{ width: "14%" }}>{t("draftsTable.colType")}</th>
            <th style={{ width: "18%" }} />
          </tr>
        </thead>

        <tbody>
          {drafts.map((draft) => {
            const id = normalizeId(draft.event_id);
            const meta = getDraftImpactMeta(draft.max_impact_level, t);
            const checked = selectedSet.has(id);
            const dismissing = dismissingSet.has(id);

            const productNames = Array.isArray(draft.impacts)
              ? draft.impacts
                  .map((impact) => impact.product_name)
                  .filter(Boolean)
                  .join(", ")
              : "—";

            const suggestedTypeKey = String(
              draft.suggested_event_type || "",
            ).toLowerCase();

            return (
              <tr
                key={draft.event_id}
                className={`drafts-row ${
                  checked ? "drafts-row-selected" : ""
                } ${dismissing ? "drafts-row-busy" : ""}`}
              >
                <td>
                  <input
                    type="checkbox"
                    className="drafts-checkbox"
                    checked={checked}
                    disabled={dismissing}
                    onChange={(e) =>
                      onToggleOne?.(draft.event_id, e.target.checked)
                    }
                    aria-label={t("draftsTable.selectOne")}
                  />
                </td>

                <td>
                  <div className="drafts-dates">
                    {draft.start_date} – {draft.end_date}
                  </div>

                  {draft.duration_days && (
                    <div className="drafts-duration">
                      {t("draftsTable.durationDays", {
                        count: draft.duration_days,
                      })}
                    </div>
                  )}
                </td>

                <td>
                  <div className="drafts-products" title={productNames}>
                    {productNames || "—"}
                  </div>
                </td>

                <td>
                  <span className={`drafts-impact-pill ${meta.cls}`}>
                    {meta.label}
                  </span>
                </td>

                <td>
                  <span className="drafts-type">
                    {suggestedTypeKey
                      ? t(`form.types.${suggestedTypeKey}`, {
                          defaultValue: draft.suggested_event_type || "—",
                        })
                      : "—"}
                  </span>
                </td>

                <td>
                  <button
                    type="button"
                    className="drafts-review-btn"
                    onClick={() => onReview(draft)}
                    disabled={dismissing}
                  >
                    {t("draftsTable.reviewBtn")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}