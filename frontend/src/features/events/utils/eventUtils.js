// frontend/src/features/events/utils/eventUtils.js
export function isoToDate(iso) {
  if (!iso) return null;
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function toIsoDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDateRange(startIso, endIso) {
  if (!startIso || !endIso) return "-";
  return `${startIso} → ${endIso}`;
}

export function pickEventTitle(ev) {
  if (!ev || typeof ev !== "object") return "-";
  return ev.event_name || ev.event_name_ar || `Event #${ev.event_id ?? ""}`.trim();
}

export function validateEventPayload(p) {
  if (!p?.event_name || String(p.event_name).trim().length < 2) {
    return "Event name (English) is required.";
  }
  if (!p?.event_type) return "Event type is required.";
  if (!p?.start_date) return "Start date is required.";
  if (!p?.end_date) return "End date is required.";

  const s = isoToDate(p.start_date);
  const e = isoToDate(p.end_date);
  if (!s || !e) return "Invalid start/end date.";
  if (e.getTime() < s.getTime()) return "End date must be on or after start date.";

  if (p.is_recurring) {
    if (!p.recurrence_type) return "Recurrence type is required for recurring events.";
  }
  return "";
}

export function startOfMonth(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), 1);
}

export function addMonths(d, n) {
  const dt = d instanceof Date ? d : new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth() + Number(n || 0), 1);
}

export function monthLabel(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function daysGridForMonth(monthDate) {
  const start = startOfMonth(monthDate);
  const year = start.getFullYear();
  const month = start.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Sunday-based week (0..6)
  const startOffset = firstDay.getDay(); // 0=Sun
  const gridStart = new Date(year, month, 1 - startOffset);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({
      date: d,
      inMonth: d.getMonth() === month,
      isStart: sameDay(d, firstDay),
      isEnd: sameDay(d, lastDay),
    });
  }
  return days;
}

export function sameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function inRangeInclusive(day, start, end) {
  const t = day.setHours(0, 0, 0, 0);
  const s = new Date(start).setHours(0, 0, 0, 0);
  const e = new Date(end).setHours(0, 0, 0, 0);
  return t >= s && t <= e;
}