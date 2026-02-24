// frontend/src/features/events/pages/CalendarPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, PageHeader, InfoMessage } from "../../../shared/components";
import { getEvents } from "../../../api/events";
import CalendarMonth from "../components/CalendarMonth";
import { startOfMonth, addMonths, monthLabel } from "../utils/eventUtils";
import { CalendarSkeleton } from "../components/Skeletons";
import "./Calendar.css";

const toYm = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const parseYm = (s) => {
  const v = String(s || "").trim();
  const m = v.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const yy = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(yy) || Number.isNaN(mm)) return null;
  if (mm < 1 || mm > 12) return null;
  return new Date(yy, mm - 1, 1);
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [jumpYm, setJumpYm] = useState(() => toYm(startOfMonth(new Date())));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        // Use upcoming=false so the calendar can show all (past + future)
        const data = await getEvents({ upcoming: false });
        if (!alive) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
      } catch (e) {
        if (!alive) return;
        setEvents([]);
        setError(e?.message || "Failed to load events.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  // keep input synced when anchor changes (prev/next/today)
  useEffect(() => {
    setJumpYm(toYm(anchor));
  }, [anchor]);

  const title = useMemo(() => monthLabel(anchor), [anchor]);

  const applyJump = () => {
    const d = parseYm(jumpYm);
    if (!d) return;
    setAnchor(startOfMonth(d));
  };

  return (
    <div className="calendar-page">
      <PageHeader
        title="Calendar"
        subtitle="Events displayed on a monthly calendar."
        actions={
          <div className="calendar-actions">
            <Button type="button" variant="secondary" onClick={() => navigate("/app/events")}>
              Events List
            </Button>

            <Button type="button" variant="secondary" onClick={() => setAnchor(startOfMonth(new Date()))}>
              Today
            </Button>

            <Button type="button" variant="secondary" onClick={() => setAnchor((d) => addMonths(d, -1))}>
              Prev
            </Button>

            <Button type="button" variant="secondary" onClick={() => setAnchor((d) => addMonths(d, 1))}>
              Next
            </Button>

            {/* NEW: jump by typing month/year */}
            <div className="calendar-jump">
              <span className="calendar-jump-label">Go to</span>
              <input
                className="calendar-jump-input"
                type="month"
                value={jumpYm}
                onChange={(e) => setJumpYm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyJump();
                }}
                aria-label="Go to month"
              />
              <Button type="button" variant="secondary" onClick={applyJump}>
                Go
              </Button>
            </div>
          </div>
        }
      />

      {error && <InfoMessage type="error">{error}</InfoMessage>}

      <Card title={title} subtitle="Click an event to open details.">
        {loading ? (
          <CalendarSkeleton />
        ) : (
          <CalendarMonth
            monthDate={anchor}
            events={events}
            onOpenEvent={(id) => navigate(`/app/events/${id}`)}
          />
        )}
      </Card>
    </div>
  );
}