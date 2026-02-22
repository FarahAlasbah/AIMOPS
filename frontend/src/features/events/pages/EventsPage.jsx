// frontend/src/features/events/pages/EventsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, PageHeader, InfoMessage } from "../../../shared/components";
import { getEvents } from "../../../api/events";
import EventForm from "../components/EventForm";
import EventsTable from "../components/EventsTable";
import { EventsListSkeleton } from "../components/Skeletons";
import "./Events.css";

export default function EventsPage() {
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
      setError(e?.message || "Failed to load events.");
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
            All
          </button>
          <button
            type="button"
            className={`seg-btn ${upcoming ? "active" : ""}`}
            onClick={() => setUpcoming(true)}
          >
            Upcoming
          </button>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/app/calendar")}
        >
          View Calendar
        </Button>

        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Close" : "Create Event"}
        </Button>
      </div>
    );
  }, [navigate, upcoming, showCreate]);

  return (
    <div className="events-page">
      <PageHeader
        title="Events"
        subtitle="Create and manage events, then view them on your calendar."
        actions={headerActions}
      />

      {notice && <InfoMessage type="success">{notice}</InfoMessage>}
      {error && <InfoMessage type="error">{error}</InfoMessage>}

      {showCreate && (
        <Card
          title="Create Event"
          subtitle="Fill in event details. It will appear on the Calendar page immediately."
          className="events-create-card"
        >
          <EventForm
            saving={saving}
            onSavingChange={setSaving}
            onSuccess={(msg) => {
              setNotice(msg || "Event created successfully.");
              setShowCreate(false);
              load();
            }}
            onError={(msg) => setError(msg || "Failed to create event.")}
          />
        </Card>
      )}

      <Card
        title={upcoming ? "Upcoming Events" : "All Events"}
        subtitle="Click any event to view details."
      >
        {loading ? (
          <EventsListSkeleton />
        ) : events.length === 0 ? (
          <div className="events-empty">
            <div className="events-empty-title">No events found</div>
            <div className="events-empty-subtitle">
              Create your first event to see it here and on the calendar.
            </div>
          </div>
        ) : (
          <EventsTable events={events} onOpen={(id) => navigate(`/app/events/${id}`)} />
        )}
      </Card>
    </div>
  );
}