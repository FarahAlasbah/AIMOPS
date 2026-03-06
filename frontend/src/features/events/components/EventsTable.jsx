// frontend/src/features/events/components/EventsTable.jsx
import { useTranslation } from "react-i18next";
import "./EventsTable.css";
import { fmtDateRange, pickEventTitle } from "../utils/eventUtils";

export default function EventsTable({ events, onOpen }) {
  const { t } = useTranslation("events");

  return (
    <div className="events-table-wrap">
      <table className="events-table">
        <thead>
          <tr>
            <th style={{ width: "34%" }}>{t("table.colEvent")}</th>
            <th style={{ width: "22%" }}>{t("table.colDates")}</th>
            <th style={{ width: "14%" }}>{t("table.colType")}</th>
            <th style={{ width: "12%" }}>{t("table.colStatus")}</th>
            <th style={{ width: "18%" }}>{t("table.colRecurring")}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.event_id} onClick={() => onOpen?.(ev.event_id)} className="events-row">
              <td>
                <div className="ev-title">{pickEventTitle(ev)}</div>
                {ev?.description ? <div className="ev-sub">{ev.description}</div> : null}
              </td>
              <td className="mono">{fmtDateRange(ev?.start_date, ev?.end_date)}</td>
              <td>{ev?.event_type || "-"}</td>
              <td>
                <span className={`pill pill-${String(ev?.status || "").toLowerCase()}`}>
                  {ev?.status || "-"}
                </span>
              </td>
              <td>
                {ev?.is_recurring ? (
                  <span className="pill pill-recurring">{ev?.recurrence_type || "recurring"}</span>
                ) : (
                  <span className="pill pill-muted">{t("table.recurringNo")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}