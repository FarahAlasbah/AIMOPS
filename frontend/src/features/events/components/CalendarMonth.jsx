// frontend/src/features/events/components/CalendarMonth.jsx
import "./CalendarMonth.css";
import {
  daysGridForMonth,
  isoToDate,
  sameDay,
  pickEventTitle,
  inRangeInclusive,
  toIsoDate,
} from "../utils/eventUtils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarMonth({ monthDate, events = [], onOpenEvent }) {
  const days = daysGridForMonth(monthDate);

  // Pre-parse events for faster checks
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

          const dayEvents = parsed
            .filter((ev) => inRangeInclusive(day.date, ev.__start, ev.__end))
            .slice(0, 4);

          const more = Math.max(
            0,
            parsed.filter((ev) => inRangeInclusive(day.date, ev.__start, ev.__end)).length - dayEvents.length
          );

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

                {more > 0 && <div className="cal-more">+{more} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}