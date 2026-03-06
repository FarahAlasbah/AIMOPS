// frontend/src/features/events/pages/EventsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Card, PageHeader, InfoMessage } from "../../../shared/components";
import { getEvents } from "../../../api/events";
import EventForm from "../components/EventForm";
import EventsTable from "../components/EventsTable";
import { EventsListSkeleton } from "../components/Skeletons";
import "./Events.css";

export default function EventsPage() {
  const { t } = useTranslation("events");
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [events, setEvents] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getEvents({ upcoming });
      const list = Array.isArray(data?.events) ? data.events : [];
      setEvents(list);
    } catch (e) {
      setEvents([]);
      setError(e?.message || t("eventsPage.errorLoadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming]);

  const headerActions = useMemo(() => {
    return (
      <div className="events-actions">
        <div className="events-toggle">
          <button
            type="button"
            className={`seg-btn ${!upcoming ? "active" : ""}`}
            onClick={() => setUpcoming(false)}
          >
            {t("eventsPage.btnAll")}
          </button>
          <button
            type="button"
            className={`seg-btn ${upcoming ? "active" : ""}`}
            onClick={() => setUpcoming(true)}
          >
            {t("eventsPage.btnUpcoming")}
          </button>
        </div>

        <Button type="button" variant="secondary" onClick={() => navigate("/app/calendar")}>
          {t("eventsPage.btnViewCalendar")}
        </Button>

        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? t("eventsPage.btnClose") : t("eventsPage.btnCreateEvent")}
        </Button>
      </div>
    );
  }, [navigate, upcoming, showCreate, t]);

  return (
    <div className="events-page">
      <PageHeader
        title={t("eventsPage.title")}
        subtitle={t("eventsPage.subtitle")}
        actions={headerActions}
      />

      {notice && <InfoMessage type="success">{notice}</InfoMessage>}
      {error && <InfoMessage type="error">{error}</InfoMessage>}

      {showCreate && (
        <Card
          title={t("eventsPage.createCardTitle")}
          subtitle={t("eventsPage.createCardSubtitle")}
          className="events-create-card"
        >
          <EventForm
            saving={saving}
            onSavingChange={setSaving}
            onSuccess={(msg) => {
              setNotice(msg || t("eventsPage.noticeCreated"));
              setShowCreate(false);
              load();
            }}
            onError={(msg) => setError(msg || t("eventsPage.errorCreateFailed"))}
          />
        </Card>
      )}

      <Card
        title={upcoming ? t("eventsPage.cardTitleUpcoming") : t("eventsPage.cardTitleAll")}
        subtitle={t("eventsPage.cardSubtitle")}
      >
        {loading ? (
          <EventsListSkeleton />
        ) : events.length === 0 ? (
          <div className="events-empty">
            <div className="events-empty-title">{t("eventsPage.emptyTitle")}</div>
            <div className="events-empty-subtitle">{t("eventsPage.emptySubtitle")}</div>
          </div>
        ) : (
          <EventsTable events={events} onOpen={(id) => navigate(`/app/events/${id}`)} />
        )}
      </Card>
    </div>
  );
}