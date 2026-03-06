// frontend/src/features/events/components/CalendarMonth.jsx
import { useTranslation } from "react-i18next";
import "./CalendarMonth.css";
import {
  daysGridForMonth,
  isoToDate,
  pickEventTitle,
  inRangeInclusive,
  toIsoDate,
} from "../utils/eventUtils";

export default function CalendarMonth({ monthDate, events = [], onOpenEvent }) {
  const { t } = useTranslation("events");

  const WEEKDAYS = [
    t("calendar.weekdays.sun"),
    t("calendar.weekdays.mon"),
    t("calendar.weekdays.tue"),
    t("calendar.weekdays.wed"),
    t("calendar.weekdays.thu"),
    t("calendar.weekdays.fri"),
    t("calendar.weekdays.sat"),
  ];

  const days = daysGridForMonth(monthDate);

  const parsed = events
    .map((e) => {
      const s = isoToDate(e?.start_date);
      const en = isoToDate(e?.end_date);
      if (!s || !en) return null;
      return { ...e, __start: s, __end: en };
    })
    .filter(Boolean);

  const todayIso = toIsoDate(new Date());

  return (
    <div className="cal">
      <div className="cal-head">
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-wd">
            {d}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {days.map((day) => {
          const iso = toIsoDate(day.date);
          const isToday = iso === todayIso;

          const allDayEvents = parsed.filter((ev) =>
            inRangeInclusive(day.date, ev.__start, ev.__end)
          );
          const dayEvents = allDayEvents.slice(0, 4);
          const more = Math.max(0, allDayEvents.length - dayEvents.length);

          return (
            <div
              key={iso}
              className={`cal-cell ${day.inMonth ? "in" : "out"} ${isToday ? "today" : ""}`}
            >
              <div className="cal-daynum">{day.date.getDate()}</div>

              <div className="cal-events">
                {dayEvents.map((ev) => (
                  <button
                    key={`${ev.event_id}-${iso}`}
                    type="button"
                    className="cal-ev"
                    onClick={() => onOpenEvent?.(ev.event_id)}
                    title={pickEventTitle(ev)}
                  >
                    <span className="cal-ev-dot" />
                    <span className="cal-ev-text">{pickEventTitle(ev)}</span>
                  </button>
                ))}

                {more > 0 && (
                  <div className="cal-more">
                    {t("calendar.moreEvents", { count: more })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}