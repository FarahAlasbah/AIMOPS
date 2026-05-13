// frontend/src/shared/components/FormCalendar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

  const startOffset = first.getDay();
  const gridStart = new Date(y, m, 1 - startOffset);

  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);

    days.push({
      date: d,
      inMonth: d.getMonth() === m,
    });
  }

  return days;
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const getMonthLabels = (locale = "en") => {
  const labels = [];

  for (let i = 0; i < 12; i += 1) {
    labels.push(
      new Date(2000, i, 1).toLocaleString(locale === "ar" ? "ar" : "en", {
        month: "long",
      }),
    );
  }

  return labels;
};

const clampAnchorToMinMax = (monthDate, minD, maxD) => {
  const first = startOfMonth(monthDate);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);

  if (minD && clampDay(last).getTime() < clampDay(minD).getTime()) {
    return startOfMonth(minD);
  }

  if (maxD && clampDay(first).getTime() > clampDay(maxD).getTime()) {
    return startOfMonth(maxD);
  }

  return first;
};

const FormCalendar = ({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  error,
  placeholder,
  ...props
}) => {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => isoToDate(value), [value]);
  const minD = useMemo(() => isoToDate(min), [min]);
  const maxD = useMemo(() => isoToDate(max), [max]);

  const [anchor, setAnchor] = useState(() => {
    if (selected) return startOfMonth(selected);
    return startOfMonth(new Date());
  });

  const safePlaceholder = placeholder || t("shared.formCalendar.placeholder");
  const monthLabels = useMemo(() => getMonthLabels(locale), [locale]);

  const [monthIdx, setMonthIdx] = useState(anchor.getMonth());
  const [yearText, setYearText] = useState(String(anchor.getFullYear()));

  useEffect(() => {
    if (selected) {
      const next = startOfMonth(selected);
      setAnchor(clampAnchorToMinMax(next, minD, maxD));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    setMonthIdx(anchor.getMonth());
    setYearText(String(anchor.getFullYear()));
  }, [anchor]);

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

    const nextMonthFirst = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      1,
    );

    return clampDay(nextMonthFirst).getTime() <= clampDay(maxD).getTime();
  };

  const setAnchorSafe = (d) => setAnchor(clampAnchorToMinMax(d, minD, maxD));

  const applyMonthYear = (nextMonthIdx, nextYear) => {
    if (Number.isNaN(nextYear) || nextYear < 1000 || nextYear > 9999) return;

    const next = new Date(nextYear, nextMonthIdx, 1);
    setAnchorSafe(next);
  };

  return (
    <div className="form-group form-calendar" ref={wrapRef}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}

      <div
        className={`fc-field ${disabled ? "disabled" : ""} ${
          error ? "error" : ""
        }`}
      >
        <input
          type="text"
          className={`form-input fc-input ${error ? "error" : ""}`}
          value={value || ""}
          placeholder={safePlaceholder}
          readOnly
          disabled={disabled}
          onClick={() => !disabled && setOpen((current) => !current)}
          {...props}
        />

        <button
          type="button"
          className="fc-btn"
          onClick={() => !disabled && setOpen((current) => !current)}
          disabled={disabled}
          aria-label={t("shared.formCalendar.openCalendar")}
        >
          ▾
        </button>

        {open && !disabled && (
          <div className="fc-pop" role="dialog" aria-modal="false">
            <div className="fc-head">
              <button
                type="button"
                className="fc-nav"
                onClick={() => setAnchorSafe(addMonths(anchor, -1))}
                disabled={!canPrev()}
                aria-label={t("shared.formCalendar.prevMonth")}
              >
                ‹
              </button>

              <div
                className="fc-ctrls"
                aria-label={t("shared.formCalendar.monthAndYear")}
              >
                <select
                  className="fc-month"
                  value={monthIdx}
                  onChange={(e) => {
                    const nextM = Number(e.target.value);
                    setMonthIdx(nextM);

                    const y = Number(yearText);
                    applyMonthYear(nextM, y);
                  }}
                >
                  {monthLabels.map((monthLabel, idx) => (
                    <option key={monthLabel} value={idx}>
                      {monthLabel}
                    </option>
                  ))}
                </select>

                <input
                  className="fc-year"
                  type="number"
                  value={yearText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setYearText(v);

                    const y = Number(v);
                    if (!Number.isNaN(y)) applyMonthYear(monthIdx, y);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const y = Number(yearText);
                      applyMonthYear(monthIdx, y);
                    }
                  }}
                  aria-label={t("shared.formCalendar.yearAriaLabel")}
                />
              </div>

              <button
                type="button"
                className="fc-nav"
                onClick={() => setAnchorSafe(addMonths(anchor, 1))}
                disabled={!canNext()}
                aria-label={t("shared.formCalendar.nextMonth")}
              >
                ›
              </button>
            </div>

            <div className="fc-week">
              {WEEKDAY_KEYS.map((key) => (
                <div key={key} className="fc-wd">
                  {t(`shared.formCalendar.weekdays.${key}`)}
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
                {t("shared.formCalendar.clear")}
              </button>

              <button type="button" className="fc-link" onClick={pickToday}>
                {t("shared.formCalendar.today")}
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