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

const normalizeKey = (value) => String(value || "").trim().toLowerCase();

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
        .map((event) => String(event?.event_id ?? "").trim())
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
                  label={t("table.selectAllConfirmed")}
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
          {events.map((event) => {
            const id = String(event?.event_id ?? "");
            const selected = selectedSet.has(id);
            const deleting = deletingSet.has(id);

            const typeKey = normalizeKey(event?.event_type);
            const statusKey = normalizeKey(event?.status);
            const recurrenceKey = normalizeKey(event?.recurrence_type);

            return (
              <tr
                key={event.event_id}
                onClick={() => {
                  if (!deleting) onOpen?.(event.event_id);
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
                      onChange={(e) =>
                        onToggleOne?.(event.event_id, e.target.checked)
                      }
                      aria-label={t("table.selectConfirmed")}
                    />
                  </td>
                )}

                <td>
                  <div className="ev-title">{pickEventTitle(event)}</div>

                  {event?.description ? (
                    <div className="ev-sub">{event.description}</div>
                  ) : null}
                </td>

                <td className="mono">
                  {fmtDateRange(event?.start_date, event?.end_date)}
                </td>

                <td>
                  {typeKey
                    ? t(`form.types.${typeKey}`, {
                        defaultValue: event?.event_type || "-",
                      })
                    : "-"}
                </td>

                <td>
                  <span
                    className={`pill pill-${String(event?.status || "").toLowerCase()}`}
                  >
                    {statusKey
                      ? t(`table.statuses.${statusKey}`, {
                          defaultValue: event?.status || "-",
                        })
                      : "-"}
                  </span>
                </td>

                <td>
                  {event?.is_recurring ? (
                    <span className="pill pill-recurring">
                      {recurrenceKey
                        ? t(`form.recurrenceOptions.${recurrenceKey}`, {
                            defaultValue:
                              event?.recurrence_type ||
                              t("table.recurrenceFallback"),
                          })
                        : t("table.recurrenceFallback")}
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
                      onClick={() => onDeleteOne?.(event)}
                    >
                      {deleting ? t("table.deleting") : t("table.delete")}
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