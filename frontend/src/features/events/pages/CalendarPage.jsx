// frontend/src/features/events/pages/CalendarPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  FormSelect,
  InfoMessage,
} from "../../../shared/components";
import { getEvents } from "../../../api/events";
import { getCampaignCalendar } from "../../../api/campaigns";
import CalendarMonth from "../components/CalendarMonth";
import { startOfMonth, addMonths, monthLabel } from "../utils/eventUtils";
import { CalendarSkeleton } from "../components/Skeletons";
import "./Calendar.css";

const getYearOptions = (selectedYear) => {
  const currentYear = new Date().getFullYear();
  const minYear = Math.min(currentYear, selectedYear) - 4;
  const maxYear = Math.max(currentYear, selectedYear) + 6;

  return Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => minYear + index,
  );
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCalendarRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 7);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
};

const normalizeCampaignAsCalendarEvent = (campaign) => {
  const campaignId = campaign?.campaign_id ?? campaign?.id;

  return {
    ...campaign,
    event_id: `campaign-${campaignId}`,
    event_name: campaign?.campaign_name || campaign?.name || "",
    title: campaign?.campaign_name || campaign?.name || "",
    start_date: campaign?.start_date,
    end_date: campaign?.end_date,
    calendar_type: "campaign",
    source: "campaign",
    campaign_id: campaignId,
    status: campaign?.status || "active",
  };
};

export default function CalendarPage() {
  const { t, i18n } = useTranslation("events");
  const navigate = useNavigate();

  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [jumpMonth, setJumpMonth] = useState(() => new Date().getMonth());
  const [jumpYear, setJumpYear] = useState(() => new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);

  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2026, index, 1);

      return {
        value: String(index),
        label: date.toLocaleDateString(locale === "ar" ? "ar" : "en", {
          month: "long",
        }),
      };
    });
  }, [locale]);

  const yearOptions = useMemo(() => {
    return getYearOptions(jumpYear).map((year) => ({
      value: String(year),
      label: String(year),
    }));
  }, [jumpYear]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const { startDate, endDate } = getCalendarRange(anchor);

        const [eventsResult, campaignsResult] = await Promise.allSettled([
          getEvents({ upcoming: false }),
          getCampaignCalendar({ startDate, endDate }),
        ]);

        if (!alive) return;

        let nextEvents = [];
        let nextCampaigns = [];

        if (eventsResult.status === "fulfilled") {
          const allEvents = Array.isArray(eventsResult.value?.events)
            ? eventsResult.value.events
            : [];

          nextEvents = allEvents.filter((event) => {
            const status = String(event?.status || "").toLowerCase();

            return status !== "detected" && status !== "draft";
          });
        }

        if (campaignsResult.status === "fulfilled") {
          const campaigns = Array.isArray(campaignsResult.value?.campaigns)
            ? campaignsResult.value.campaigns
            : [];

          nextCampaigns = campaigns.map(normalizeCampaignAsCalendarEvent);
        }

        setEvents([...nextEvents, ...nextCampaigns]);

        if (
          eventsResult.status === "rejected" &&
          campaignsResult.status === "rejected"
        ) {
          setError(t("calendarPage.errorLoadFailed"));
        }
      } catch (e) {
        if (!alive) return;

        setEvents([]);
        setError(e?.message || t("calendarPage.errorLoadFailed"));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [anchor, t]);

  useEffect(() => {
    setJumpMonth(anchor.getMonth());
    setJumpYear(anchor.getFullYear());
  }, [anchor]);

  const title = useMemo(() => monthLabel(anchor, locale), [anchor, locale]);

  const applyJump = () => {
    const nextDate = new Date(Number(jumpYear), Number(jumpMonth), 1);
    setAnchor(startOfMonth(nextDate));
  };

  const handleOpenCalendarItem = (id) => {
    const value = String(id || "");

    if (value.startsWith("campaign-")) {
      const campaignId = value.replace("campaign-", "");
      navigate(`/app/campaigns/${campaignId}`);
      return;
    }

    navigate(`/app/events/${value}`);
  };

  return (
    <div className="calendar-page">
      <div className="calendar-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/app/events")}
        >
          {t("calendarPage.btnEventsList")}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setAnchor(startOfMonth(new Date()))}
        >
          {t("calendarPage.btnToday")}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setAnchor((date) => addMonths(date, -1))}
        >
          {t("calendarPage.btnPrev")}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setAnchor((date) => addMonths(date, 1))}
        >
          {t("calendarPage.btnNext")}
        </Button>

        <div className="calendar-jump">
          <span className="calendar-jump-label">
            {t("calendarPage.jumpLabel")}
          </span>

          <FormSelect
            className="calendar-jump-select calendar-jump-month"
            value={String(jumpMonth)}
            onChange={(e) => setJumpMonth(Number(e.target.value))}
            options={monthOptions}
            aria-label={t("calendarPage.jumpAriaLabel")}
          />

          <FormSelect
            className="calendar-jump-select calendar-jump-year"
            value={String(jumpYear)}
            onChange={(e) => setJumpYear(Number(e.target.value))}
            options={yearOptions}
            aria-label={t("calendarPage.jumpYearAriaLabel")}
          />

          <Button type="button" variant="secondary" onClick={applyJump}>
            {t("calendarPage.btnGo")}
          </Button>
        </div>
      </div>

      {error ? <InfoMessage type="error">{error}</InfoMessage> : null}

      <Card title={title} subtitle={t("calendarPage.cardSubtitle")}>
        {loading ? (
          <CalendarSkeleton />
        ) : (
          <CalendarMonth
            monthDate={anchor}
            events={events}
            onOpenEvent={handleOpenCalendarItem}
          />
        )}
      </Card>
    </div>
  );
}