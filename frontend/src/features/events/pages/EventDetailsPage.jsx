// frontend/src/features/events/pages/EventDetailsPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, PageHeader, InfoMessage } from "../../../shared/components";
import { analyzeEvent, getEventById } from "../../../api/events";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { fmtDateRange, pickEventTitle } from "../utils/eventUtils";
import { EventDetailsSkeleton } from "../components/Skeletons";
import ImpactAnalysisDetails from "../components/ImpactAnalysisDetails";
import EventEditForm from "../components/EventEditForm";
import "./Events.css";

function extractApiDetail(err) {
  const detail = err?.response?.data?.detail;
  if (detail && typeof detail === "object") return detail;
  return null;
}

function extractApiMessage(err) {
  const detail = extractApiDetail(err);
  if (detail?.message) return String(detail.message);
  return err?.message || "Request failed.";
}

export default function EventDetailsPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [event, setEvent] = useState(null);

  // summary from GET /api/events/:id
  const [impact, setImpact] = useState(null);

  // detailed analysis from POST /api/events/:id/analyze
  const [analysis, setAnalysis] = useState(null);

  // analysis-specific backend detail error (like insufficient_event_data)
  const [analysisBlock, setAnalysisBlock] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    setNotice("");
    setAnalysisBlock(null);

    try {
      const data = await getEventById(eventId);
      setEvent(data?.event || null);
      setImpact(data?.impact_analysis || null);

      // If backend ever starts returning detailed analysis on GET later
      if (data?.impact_analysis?.analysis) setAnalysis(data.impact_analysis.analysis);
    } catch (e) {
      setError(extractApiMessage(e) || "Failed to load event.");
      setEvent(null);
      setImpact(null);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function runAnalysis() {
    if (!event) return;

    setAnalyzing(true);
    setError("");
    setNotice("");
    setAnalysisBlock(null);

    const payload = {
      event_name: event.event_name,
      event_name_ar: event.event_name_ar,
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date,
      description: event.description,
      is_recurring: !!event.is_recurring,
      recurrence_type: event.is_recurring ? event.recurrence_type : null,
    };

    try {
      const res = await analyzeEvent(eventId, payload);
      if (!res?.success) throw new Error(res?.message || "Analysis failed.");

      setNotice(res?.message || "Impact analysis completed.");
      setAnalysis(res?.analysis || null);

      if (res?.analysis) {
        setImpact((prev) => ({
          ...(prev || {}),
          is_analyzed: true,
          overall_impact: res.analysis.overall_impact || prev?.overall_impact || "none",
          affected_products_count:
            Number(res.analysis.affected_products_count) || prev?.affected_products_count || 0,
        }));
      }
    } catch (e) {
      const detail = extractApiDetail(e);

      if (detail?.error === "insufficient_event_data") {
        setAnalysisBlock(detail);
      } else {
        setError(extractApiMessage(e) || "Failed to analyze impact.");
      }
    } finally {
      setAnalyzing(false);
    }
  }

  const canEdit = hasPermission?.("events.edit");

  return (
    <div className="events-page">
      <PageHeader
        title="Event Details"
        subtitle="View event information, edit it, and run impact analysis."
        actions={
          <div className="events-actions">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>

            <Button type="button" variant="secondary" onClick={() => navigate("/app/calendar")}>
              View Calendar
            </Button>

            {canEdit && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "Close Edit" : "Edit Event"}
              </Button>
            )}
          </div>
        }
      />

      {notice && <InfoMessage type="success">{notice}</InfoMessage>}
      {error && <InfoMessage type="error">{error}</InfoMessage>}

      {loading ? (
        <EventDetailsSkeleton />
      ) : !event ? (
        <Card>
          <div className="events-empty">
            <div className="events-empty-title">Event not found</div>
            <div className="events-empty-subtitle">
              The event may have been deleted or is unavailable.
            </div>
          </div>
        </Card>
      ) : (
        <>
          {editing && canEdit && (
            <Card title="Edit Event" subtitle="Update any event field and save.">
              <EventEditForm
                eventId={eventId}
                initialEvent={event}
                saving={savingEdit}
                onSavingChange={setSavingEdit}
                onCancel={() => setEditing(false)}
                onSuccess={(res) => {
                  setNotice(res?.message || "Event updated successfully.");
                  setEditing(false);

                  // Clear old analysis (event dates/details changed)
                  setAnalysis(null);
                  setAnalysisBlock(null);

                  // Reload fresh data from backend
                  load();
                }}
                onError={(msg) => setError(msg || "Failed to update event.")}
              />
            </Card>
          )}

          <Card
            title={pickEventTitle(event)}
            subtitle={fmtDateRange(event?.start_date, event?.end_date)}
          >
            <div className="event-details-grid">
              <div className="detail-item">
                <div className="detail-label">Type</div>
                <div className="detail-value">{event?.event_type || "-"}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Status</div>
                <div className="detail-value">{event?.status || "-"}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Duration</div>
                <div className="detail-value">
                  {Number(event?.duration_days) ? `${event.duration_days} days` : "-"}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Recurring</div>
                <div className="detail-value">
                  {event?.is_recurring ? `Yes (${event?.recurrence_type || "-"})` : "No"}
                </div>
              </div>
            </div>

            {event?.description && (
              <div className="event-desc">
                <div className="detail-label">Description</div>
                <div className="detail-text">{event.description}</div>
              </div>
            )}
          </Card>

          <Card title="Impact Analysis" subtitle="Run analysis to calculate impact and see affected products.">
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <Button type="button" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? "Analyzing..." : "Analyze Impact"}
              </Button>

              <Button type="button" variant="secondary" onClick={() => navigate("/app/data-upload")}>
                Upload Sales Data
              </Button>

              <div style={{ color: "#6b7280", fontSize: 13, fontWeight: 600 }}>
                {impact?.is_analyzed ? "Analyzed" : "Not analyzed"}
                {impact?.overall_impact ? ` • Overall: ${impact.overall_impact}` : ""}
                {impact?.affected_products_count !== undefined ? ` • Affected: ${impact.affected_products_count}` : ""}
              </div>
            </div>

            {analysisBlock ? (
              <div style={{ marginBottom: 14 }}>
                <InfoMessage type="warning">
                  {analysisBlock.message || "Cannot analyze yet. Missing required sales data for this event period."}
                </InfoMessage>

                <div className="impact-grid" style={{ marginTop: 12 }}>
                  <div className="detail-item">
                    <div className="detail-label">Required event period</div>
                    <div className="detail-value">{analysisBlock.required_event_period || "-"}</div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">Available data ends</div>
                    <div className="detail-value">{analysisBlock.available_data_ends || "-"}</div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">Missing period</div>
                    <div className="detail-value">{analysisBlock.missing_period || "-"}</div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">Hint</div>
                    <div className="detail-value">{analysisBlock.hint || "-"}</div>
                  </div>
                </div>
              </div>
            ) : analysis ? (
              <ImpactAnalysisDetails analysis={analysis} />
            ) : (
              <InfoMessage type="info">
                No detailed analysis yet. Click “Analyze Impact” to calculate and show affected products.
              </InfoMessage>
            )}
          </Card>
        </>
      )}
    </div>
  );
}