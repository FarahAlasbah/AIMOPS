// frontend/src/features/events/components/EventsTable.jsx
import { useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./EventsTable.css";
import { fmtDateRange, pickEventTitle } from "../utils/eventUtils";

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
      className="events-checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
      aria-label={label}
    />
  );
}

const toSet = (value) => {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value.map(String));
  return new Set();
};

export default function EventsTable({
  events = [],
  onOpen,
  selectable = false,
  selectedIds = [],
  deletingIds = [],
  onToggleOne,
  onToggleAll,
  onDeleteOne,
  selectionDisabled = false,
}) {
  const { t } = useTranslation("events");

  const selectedSet = useMemo(() => toSet(selectedIds), [selectedIds]);
  const deletingSet = useMemo(() => toSet(deletingIds), [deletingIds]);

  const visibleIds = useMemo(
    () =>
      events
        .map((ev) => String(ev?.event_id ?? "").trim())
        .filter(Boolean),
    [events],
  );

  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedSet.has(id),
  ).length;

  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const someVisibleSelected =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;

  return (
    <div className="events-table-wrap">
      <table className="events-table">
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: "44px" }}>
                <SelectAllCheckbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  disabled={selectionDisabled || visibleIds.length === 0}
                  onChange={onToggleAll}
                  label={t("table.selectAllConfirmed", {
                    defaultValue: "Select all confirmed events",
                  })}
                />
              </th>
            )}

            <th style={{ width: selectable ? "30%" : "34%" }}>
              {t("table.colEvent")}
            </th>
            <th style={{ width: "20%" }}>{t("table.colDates")}</th>
            <th style={{ width: "13%" }}>{t("table.colType")}</th>
            <th style={{ width: "12%" }}>{t("table.colStatus")}</th>
            <th style={{ width: "15%" }}>{t("table.colRecurring")}</th>

            {onDeleteOne && <th style={{ width: "10%" }} />}
          </tr>
        </thead>

        <tbody>
          {events.map((ev) => {
            const id = String(ev?.event_id ?? "");
            const selected = selectedSet.has(id);
            const deleting = deletingSet.has(id);

            return (
              <tr
                key={ev.event_id}
                onClick={() => {
                  if (!deleting) onOpen?.(ev.event_id);
                }}
                className={`events-row ${selected ? "events-row-selected" : ""} ${
                  deleting ? "events-row-busy" : ""
                }`}
              >
                {selectable && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="events-checkbox"
                      checked={selected}
                      disabled={selectionDisabled || deleting}
                      onChange={(e) => onToggleOne?.(ev.event_id, e.target.checked)}
                      aria-label={t("table.selectConfirmed", {
                        defaultValue: "Select confirmed event",
                      })}
                    />
                  </td>
                )}

                <td>
                  <div className="ev-title">{pickEventTitle(ev)}</div>
                  {ev?.description ? (
                    <div className="ev-sub">{ev.description}</div>
                  ) : null}
                </td>

                <td className="mono">
                  {fmtDateRange(ev?.start_date, ev?.end_date)}
                </td>

                <td>{ev?.event_type || "-"}</td>

                <td>
                  <span
                    className={`pill pill-${String(ev?.status || "").toLowerCase()}`}
                  >
                    {ev?.status || "-"}
                  </span>
                </td>

                <td>
                  {ev?.is_recurring ? (
                    <span className="pill pill-recurring">
                      {ev?.recurrence_type || "recurring"}
                    </span>
                  ) : (
                    <span className="pill pill-muted">
                      {t("table.recurringNo")}
                    </span>
                  )}
                </td>

                {onDeleteOne && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="events-delete-btn"
                      disabled={deleting}
                      onClick={() => onDeleteOne?.(ev)}
                    >
                      {deleting
                        ? t("table.deleting", { defaultValue: "Deleting..." })
                        : t("table.delete", { defaultValue: "Delete" })}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}