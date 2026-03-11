// frontend/src/features/events/pages/EventsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Card, PageHeader, InfoMessage } from "../../../shared/components";
import { getEvents, getDraftEvents } from "../../../api/events";
import EventForm from "../components/EventForm";
import EventsTable from "../components/EventsTable";
import DraftEventModal from "../components/DraftEventModal";
import { EventsListSkeleton } from "../components/Skeletons";
import "./Events.css";

const TAB_DRAFTS = "drafts";
const TAB_ALL    = "all";

// ── Draft skeleton ────────────────────────────────────────────────────────────
function DraftsSkeleton() {
  return (
    <div className="drafts-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="drafts-sk-row">
          <div className="drafts-sk-cell drafts-sk-wide"  />
          <div className="drafts-sk-cell drafts-sk-mid"   />
          <div className="drafts-sk-cell drafts-sk-short" />
          <div className="drafts-sk-cell drafts-sk-short" />
          <div className="drafts-sk-cell drafts-sk-btn"   />
        </div>
      ))}
    </div>
  );
}

// ── Impact pill helper ────────────────────────────────────────────────────────
const IMPACT_META = {
  very_high: { label: "Very High", cls: "dimp-veryhigh" },
  high:      { label: "High",      cls: "dimp-high"     },
  medium:    { label: "Medium",    cls: "dimp-medium"   },
  low:       { label: "Low",       cls: "dimp-low"      },
};
const impactMeta = (level) =>
  IMPACT_META[String(level || "").toLowerCase()] || { label: level || "—", cls: "dimp-low" };

// ── Drafts table ──────────────────────────────────────────────────────────────
function DraftsTable({ drafts, onReview }) {
  const { t } = useTranslation("events");
  return (
    <div className="drafts-table-wrap">
      <table className="drafts-table">
        <thead>
          <tr>
            <th style={{ width: "30%" }}>{t("draftsTable.colPeriod")}</th>
            <th style={{ width: "24%" }}>{t("draftsTable.colProducts")}</th>
            <th style={{ width: "16%" }}>{t("draftsTable.colImpact")}</th>
            <th style={{ width: "14%" }}>{t("draftsTable.colType")}</th>
            <th style={{ width: "16%" }} />
          </tr>
        </thead>
        <tbody>
          {drafts.map((draft) => {
            const meta = impactMeta(draft.max_impact_level);
            const productNames = Array.isArray(draft.impacts)
              ? draft.impacts.map((i) => i.product_name).filter(Boolean).join(", ")
              : "—";

            return (
              <tr key={draft.event_id} className="drafts-row">
                <td>
                  <div className="drafts-dates">
                    {draft.start_date} – {draft.end_date}
                  </div>
                  {draft.duration_days && (
                    <div className="drafts-duration">
                      {t("draftsTable.durationDays", { count: draft.duration_days })}
                    </div>
                  )}
                </td>
                <td>
                  <div className="drafts-products" title={productNames}>
                    {productNames}
                  </div>
                </td>
                <td>
                  <span className={`drafts-impact-pill ${meta.cls}`}>{meta.label}</span>
                </td>
                <td>
                  <span className="drafts-type">{draft.suggested_event_type || "—"}</span>
                </td>
                <td>
                  <button
                    type="button"
                    className="drafts-review-btn"
                    onClick={() => onReview(draft)}
                  >
                    {t("draftsTable.reviewBtn")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { t }    = useTranslation("events");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab — default to drafts if there are any, else all
  const [activeTab,  setActiveTab]  = useState(TAB_DRAFTS);
  const [upcoming,   setUpcoming]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [notice,   setNotice]   = useState("");
  const [events,   setEvents]   = useState([]);

  const [drafts,        setDrafts]        = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [activeDraft,   setActiveDraft]   = useState(null);

  // ── Loaders ───────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getEvents({ upcoming });
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (e) {
      setEvents([]);
      setError(e?.message || t("eventsPage.errorLoadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function loadDrafts() {
    setDraftsLoading(true);
    try {
      const data = await getDraftEvents();
      const list = Array.isArray(data?.draft_events) ? data.draft_events : [];
      setDrafts(list);
      // Default to "All Events" tab if no drafts
      if (list.length === 0) setActiveTab(TAB_ALL);
    } catch {
      setDrafts([]);
      setActiveTab(TAB_ALL);
    } finally {
      setDraftsLoading(false);
    }
  }

  useEffect(() => { load(); },       [upcoming]); // eslint-disable-line
  useEffect(() => { loadDrafts(); }, []);

  // ── Load "All Events" tab data lazily when first switched to ──────────────
  const [allLoaded, setAllLoaded] = useState(false);
  useEffect(() => {
    if (activeTab === TAB_ALL && !allLoaded && !loading) {
      setAllLoaded(true);
    }
  }, [activeTab, allLoaded, loading]);

  // ── ?draftEvent=<id> from notification ───────────────────────────────────
  useEffect(() => {
    const draftId = searchParams.get("draftEvent");
    if (!draftId || draftsLoading) return;
    const found = drafts.find((d) => String(d.event_id) === String(draftId));
    if (found) {
      setActiveTab(TAB_DRAFTS);
      setActiveDraft(found);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("draftEvent");
        return next;
      }, { replace: true });
    }
  }, [searchParams, drafts, draftsLoading]); // eslint-disable-line

  // ── Draft confirmed / dismissed ───────────────────────────────────────────
  const handleDraftConfirmed = (res, draftEvent) => {
    setNotice(
      res?.message ||
      t("eventsPage.draftConfirmedNotice", { name: res?.event_name || "" }),
    );
    const next = drafts.filter((d) => d.event_id !== draftEvent.event_id);
    setDrafts(next);
    if (next.length === 0) setActiveTab(TAB_ALL);
    load();
    setTimeout(() => setActiveDraft(null), 900);
  };

  const handleDraftDismissed = (_res, draftEvent) => {
    const next = drafts.filter((d) => d.event_id !== draftEvent.event_id);
    setDrafts(next);
    if (next.length === 0) setActiveTab(TAB_ALL);
    setTimeout(() => setActiveDraft(null), 800);
  };

  const draftCount = drafts.length;

  // ── Header actions ────────────────────────────────────────────────────────
  const headerActions = useMemo(() => (
    <div className="events-actions">
      <Button type="button" variant="secondary" onClick={() => navigate("/app/calendar")}>
        {t("eventsPage.btnViewCalendar")}
      </Button>
      <Button type="button" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? t("eventsPage.btnClose") : t("eventsPage.btnCreateEvent")}
      </Button>
    </div>
  ), [navigate, showCreate, t]);

  return (
    <div className="events-page">
      <PageHeader
        title={t("eventsPage.title")}
        subtitle={t("eventsPage.subtitle")}
        actions={headerActions}
      />

      {notice && <InfoMessage type="success">{notice}</InfoMessage>}
      {error  && <InfoMessage type="error">{error}</InfoMessage>}

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

      {/* ── Tab switcher ── */}
      <div className="ev-tabs">
        <button
          type="button"
          className={`ev-tab ${activeTab === TAB_DRAFTS ? "ev-tab-active" : ""}`}
          onClick={() => setActiveTab(TAB_DRAFTS)}
        >
          {t("eventsPage.tabDrafts")}
          {/* Badge: show count when loaded, spinner when loading */}
          {draftsLoading ? (
            <span className="ev-tab-spinner" />
          ) : draftCount > 0 ? (
            <span className="ev-tab-badge">{draftCount}</span>
          ) : null}
        </button>

        <button
          type="button"
          className={`ev-tab ${activeTab === TAB_ALL ? "ev-tab-active" : ""}`}
          onClick={() => { setActiveTab(TAB_ALL); if (!allLoaded) load(); }}
        >
          {upcoming ? t("eventsPage.tabUpcoming") : t("eventsPage.tabAll")}
        </button>

        {/* Upcoming toggle — only visible on All Events tab */}
        {activeTab === TAB_ALL && (
          <div className="ev-tabs-right">
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
          </div>
        )}
      </div>

      {/* ── Tab: Drafts ── */}
      {activeTab === TAB_DRAFTS && (
        <Card
          title={
            draftsLoading
              ? t("eventsPage.draftsCardTitle")
              : draftCount > 0
              ? t("eventsPage.draftsCardTitleCount", { count: draftCount })
              : t("eventsPage.draftsCardTitleEmpty")
          }
          subtitle={t("eventsPage.draftsCardSub")}
        >
          {draftsLoading ? (
            <DraftsSkeleton />
          ) : draftCount === 0 ? (
            <div className="events-empty">
              <div className="events-empty-title">{t("eventsPage.draftsEmptyTitle")}</div>
              <div className="events-empty-subtitle">{t("eventsPage.draftsEmptySubtitle")}</div>
            </div>
          ) : (
            <DraftsTable drafts={drafts} onReview={setActiveDraft} />
          )}
        </Card>
      )}

      {/* ── Tab: All Events ── */}
      {activeTab === TAB_ALL && (
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
      )}

      {/* ── Modal ── */}
      {activeDraft && (
        <DraftEventModal
          event={activeDraft}
          onClose={() => setActiveDraft(null)}
          onConfirmed={handleDraftConfirmed}
          onDismissed={handleDraftDismissed}
        />
      )}
    </div>
  );
}