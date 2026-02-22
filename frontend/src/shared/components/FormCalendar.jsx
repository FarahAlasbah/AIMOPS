// frontend/src/shared/components/FormCalendar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./FormInput.css";
import "./FormCalendar.css";

const isoToDate = (iso) => {
  if (!iso) return null;
  const d = new Date(String(iso));
  return Number.isNaN(d.getTime()) ? null : d;
};

const toIso = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const sameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const clampDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const inRange = (d, minD, maxD) => {
  const t = clampDay(d).getTime();
  if (minD) {
    const mn = clampDay(minD).getTime();
    if (t < mn) return false;
  }
  if (maxD) {
    const mx = clampDay(maxD).getTime();
    if (t > mx) return false;
  }
  return true;
};

const buildGrid = (monthDate) => {
  const first = startOfMonth(monthDate);
  const y = first.getFullYear();
  const m = first.getMonth();

  // Sunday-based week like your screenshot
  const startOffset = first.getDay(); // 0..6
  const gridStart = new Date(y, m, 1 - startOffset);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({
      date: d,
      inMonth: d.getMonth() === m,
    });
  }
  return days;
};

const monthTitle = (d) =>
  d.toLocaleString(undefined, { month: "long", year: "numeric" });

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const FormCalendar = ({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  error,
  placeholder = "YYYY-MM-DD",
  ...props
}) => {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => isoToDate(value), [value]);
  const minD = useMemo(() => isoToDate(min), [min]);
  const maxD = useMemo(() => isoToDate(max), [max]);

  const [anchor, setAnchor] = useState(() => {
    if (selected) return startOfMonth(selected);
    return startOfMonth(new Date());
  });

  useEffect(() => {
    if (selected) setAnchor(startOfMonth(selected));
  }, [value]); // keep month synced when value changes

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const days = useMemo(() => buildGrid(anchor), [anchor]);
  const today = useMemo(() => new Date(), []);

  const fireChange = (iso) => {
    // mimic native event shape your forms expect
    onChange?.({ target: { value: iso } });
  };

  const handlePick = (d) => {
    if (!inRange(d, minD, maxD)) return;
    fireChange(toIso(d));
    setOpen(false);
  };

  const clear = () => {
    fireChange("");
    setOpen(false);
  };

  const pickToday = () => {
    if (!inRange(today, minD, maxD)) return;
    fireChange(toIso(today));
    setOpen(false);
  };

  const canPrev = () => {
    if (!minD) return true;
    const prevMonthLast = new Date(anchor.getFullYear(), anchor.getMonth(), 0);
    return clampDay(prevMonthLast).getTime() >= clampDay(minD).getTime();
  };

  const canNext = () => {
    if (!maxD) return true;
    const nextMonthFirst = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return clampDay(nextMonthFirst).getTime() <= clampDay(maxD).getTime();
  };

  return (
    <div className="form-group form-calendar" ref={wrapRef}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}

      <div className={`fc-field ${disabled ? "disabled" : ""} ${error ? "error" : ""}`}>
        <input
          type="text"
          className={`form-input fc-input ${error ? "error" : ""}`}
          value={value || ""}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          {...props}
        />
        <button
          type="button"
          className="fc-btn"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          aria-label="Open calendar"
        >
          ▾
        </button>

        {open && !disabled && (
          <div className="fc-pop" role="dialog" aria-modal="false">
            <div className="fc-head">
              <button
                type="button"
                className="fc-nav"
                onClick={() => setAnchor((d) => addMonths(d, -1))}
                disabled={!canPrev()}
                aria-label="Previous month"
              >
                ‹
              </button>

              <div className="fc-title">{monthTitle(anchor)}</div>

              <button
                type="button"
                className="fc-nav"
                onClick={() => setAnchor((d) => addMonths(d, 1))}
                disabled={!canNext()}
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="fc-week">
              {WEEKDAYS.map((w) => (
                <div key={w} className="fc-wd">
                  {w}
                </div>
              ))}
            </div>

            <div className="fc-grid">
              {days.map(({ date, inMonth: inM }) => {
                const isSel = selected ? sameDay(date, selected) : false;
                const isToday = sameDay(date, today);
                const allowed = inRange(date, minD, maxD);

                return (
                  <button
                    key={toIso(date)}
                    type="button"
                    className={[
                      "fc-day",
                      inM ? "in" : "out",
                      isToday ? "today" : "",
                      isSel ? "sel" : "",
                    ].join(" ")}
                    onClick={() => handlePick(date)}
                    disabled={!allowed}
                    aria-label={toIso(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="fc-foot">
              <button type="button" className="fc-link" onClick={clear}>
                Clear
              </button>
              <button type="button" className="fc-link" onClick={pickToday}>
                Today
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default FormCalendar;