// frontend/src/features/events/components/CalendarMonth.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./CalendarMonth.css";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function endOfWeek(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth()
  );
}

function toDate(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return startOfDay(d);
}

function getItemId(item) {
  return (
    item?.event_id ??
    item?.id ??
    item?.campaign_id ??
    item?.eventId ??
    item?.campaignId ??
    ""
  );
}

function getItemTitle(item, fallback) {
  return (
    item?.event_name ||
    item?.campaign_name ||
    item?.title ||
    item?.name ||
    fallback
  );
}

function getItemType(item) {
  const explicitType = String(
    item?.calendar_type || item?.source || item?.item_type || "",
  ).toLowerCase();

  if (explicitType === "campaign") return "campaign";
  if (explicitType === "event") return "event";

  if (item?.campaign_id != null || item?.campaign_name) return "campaign";

  return "event";
}

function getItemStartDate(item) {
  return (
    toDate(item?.start_date) ||
    toDate(item?.date) ||
    toDate(item?.event_date) ||
    toDate(item?.start) ||
    toDate(item?.startDate) ||
    null
  );
}

function getItemEndDate(item) {
  return (
    toDate(item?.end_date) ||
    toDate(item?.end) ||
    toDate(item?.endDate) ||
    getItemStartDate(item)
  );
}

function isDateInsideRange(day, start, end) {
  if (!start) return false;

  const safeEnd = end || start;
  return day >= start && day <= safeEnd;
}

export default function CalendarMonth({
  monthDate,
  events = [],
  onOpenEvent,
}) {
  const { t, i18n } = useTranslation("events");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const today = startOfDay(new Date());

  const weekdayLabels = useMemo(() => {
    const baseSunday = new Date(2026, 0, 4);

    return Array.from({ length: 7 }, (_, index) => {
      const d = addDays(baseSunday, index);

      return d.toLocaleDateString(locale === "ar" ? "ar" : "en", {
        weekday: "short",
      });
    });
  }, [locale]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);

    const result = [];
    let cursor = new Date(gridStart);

    while (cursor <= gridEnd) {
      result.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }

    return result;
  }, [monthDate]);

  const itemsByDay = useMemo(() => {
    const map = new Map();

    days.forEach((day) => {
      const key = day.toISOString();

      const items = events
        .filter((item) => {
          const start = getItemStartDate(item);
          const end = getItemEndDate(item);

          return isDateInsideRange(day, start, end);
        })
        .sort((a, b) => {
          const aType = getItemType(a);
          const bType = getItemType(b);

          if (aType !== bType) {
            if (aType === "event") return -1;
            if (bType === "event") return 1;
          }

          return getItemTitle(a, "").localeCompare(getItemTitle(b, ""));
        });

      map.set(key, items);
    });

    return map;
  }, [days, events]);

  return (
    <div className="cal">
      <div className="cal-legend" aria-label={t("calendarPage.legendAriaLabel")}>
        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot-event" />
          <span>{t("calendarPage.legendEvent")}</span>
        </div>

        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot-campaign" />
          <span>{t("calendarPage.legendCampaign")}</span>
        </div>
      </div>

      <div className="cal-head">
        {weekdayLabels.map((label, index) => (
          <div key={`${label}-${index}`} className="cal-wd">
            {label}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {days.map((day) => {
          const dayKey = day.toISOString();
          const dayItems = itemsByDay.get(dayKey) || [];
          const visibleItems = dayItems.slice(0, 3);
          const hiddenCount = Math.max(0, dayItems.length - visibleItems.length);

          return (
            <div
              key={dayKey}
              className={[
                "cal-cell",
                !isSameMonth(day, monthDate) ? "out" : "",
                isSameDay(day, today) ? "today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="cal-daynum">{day.getDate()}</div>

              <div className="cal-items">
                {visibleItems.map((item) => {
                  const id = getItemId(item);
                  const type = getItemType(item);
                  const title = getItemTitle(item, t("calendarPage.untitled"));
                  const typeLabel =
                    type === "campaign"
                      ? t("calendarPage.legendCampaign")
                      : t("calendarPage.legendEvent");

                  return (
                    <button
                      key={`${type}-${id}-${title}`}
                      type="button"
                      className={`cal-item cal-item-${type}`}
                      onClick={() => onOpenEvent?.(id)}
                      title={t("calendarPage.itemTitle", {
                        type: typeLabel,
                        title,
                      })}
                    >
                      <span className="cal-item-dot" />
                      <span className="cal-item-text">{title}</span>
                    </button>
                  );
                })}

                {hiddenCount > 0 ? (
                  <div className="cal-more">
                    +{hiddenCount} {t("calendarPage.more")}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}