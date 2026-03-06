// frontend/src/features/events/pages/EventDetailsPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  return err?.message || null;
}

export default function EventDetailsPage() {
  const { t } = useTranslation("events");
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
  const [impact, setImpact] = useState(null);
  const [analysis, setAnalysis] = useState(null);
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
      if (data?.impact_analysis?.analysis) setAnalysis(data.impact_analysis.analysis);
    } catch (e) {
      setError(extractApiMessage(e) || t("eventDetailsPage.errorLoadFailed"));
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
    return () => { alive = false; };
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
      if (!res?.success) throw new Error(res?.message || t("eventDetailsPage.errorRequestFailed"));

      setNotice(res?.message || t("eventDetailsPage.errorRequestFailed"));
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
        setError(extractApiMessage(e) || t("eventDetailsPage.errorAnalyzeFailed"));
      }
    } finally {
      setAnalyzing(false);
    }
  }

  const canEdit = hasPermission?.("events.edit");

  // Build status summary string
  const statusParts = [];
  if (impact) {
    statusParts.push(impact.is_analyzed ? t("eventDetailsPage.statusAnalyzed") : t("eventDetailsPage.statusNotAnalyzed"));
    if (impact.overall_impact) statusParts.push(t("eventDetailsPage.statusOverall", { value: impact.overall_impact }));
    if (impact.affected_products_count !== undefined) statusParts.push(t("eventDetailsPage.statusAffected", { count: impact.affected_products_count }));
  }

  return (
    <div className="events-page">
      <PageHeader
        title={t("eventDetailsPage.title")}
        subtitle={t("eventDetailsPage.subtitle")}
        actions={
          <div className="events-actions">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              {t("eventDetailsPage.btnBack")}
            </Button>

            <Button type="button" variant="secondary" onClick={() => navigate("/app/calendar")}>
              {t("eventDetailsPage.btnViewCalendar")}
            </Button>

            {canEdit && (
              <Button type="button" variant="secondary" onClick={() => setEditing((v) => !v)}>
                {editing ? t("eventDetailsPage.btnCloseEdit") : t("eventDetailsPage.btnEditEvent")}
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
            <div className="events-empty-title">{t("eventDetailsPage.notFoundTitle")}</div>
            <div className="events-empty-subtitle">{t("eventDetailsPage.notFoundSubtitle")}</div>
          </div>
        </Card>
      ) : (
        <>
          {editing && canEdit && (
            <Card
              title={t("eventDetailsPage.editCardTitle")}
              subtitle={t("eventDetailsPage.editCardSubtitle")}
            >
              <EventEditForm
                eventId={eventId}
                initialEvent={event}
                saving={savingEdit}
                onSavingChange={setSavingEdit}
                onCancel={() => setEditing(false)}
                onSuccess={(res) => {
                  setNotice(res?.message || t("eventDetailsPage.noticeUpdated"));
                  setEditing(false);
                  setAnalysis(null);
                  setAnalysisBlock(null);
                  load();
                }}
                onError={(msg) => setError(msg || t("eventDetailsPage.errorUpdateFailed"))}
              />
            </Card>
          )}

          <Card
            title={pickEventTitle(event)}
            subtitle={fmtDateRange(event?.start_date, event?.end_date)}
          >
            <div className="event-details-grid">
              <div className="detail-item">
                <div className="detail-label">{t("eventDetailsPage.detailType")}</div>
                <div className="detail-value">{event?.event_type || "-"}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">{t("eventDetailsPage.detailStatus")}</div>
                <div className="detail-value">{event?.status || "-"}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">{t("eventDetailsPage.detailDuration")}</div>
                <div className="detail-value">
                  {Number(event?.duration_days)
                    ? t("eventDetailsPage.detailDurationValue", { days: event.duration_days })
                    : "-"}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">{t("eventDetailsPage.detailRecurring")}</div>
                <div className="detail-value">
                  {event?.is_recurring
                    ? t("eventDetailsPage.detailRecurringYes", { type: event?.recurrence_type || "-" })
                    : t("eventDetailsPage.detailRecurringNo")}
                </div>
              </div>
            </div>

            {event?.description && (
              <div className="event-desc">
                <div className="detail-label">{t("eventDetailsPage.detailDescription")}</div>
                <div className="detail-text">{event.description}</div>
              </div>
            )}
          </Card>

          <Card
            title={t("eventDetailsPage.impactCardTitle")}
            subtitle={t("eventDetailsPage.impactCardSubtitle")}
          >
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
                {analyzing ? t("eventDetailsPage.btnAnalyzing") : t("eventDetailsPage.btnAnalyzeImpact")}
              </Button>

              <Button type="button" variant="secondary" onClick={() => navigate("/app/data-upload")}>
                {t("eventDetailsPage.btnUploadSalesData")}
              </Button>

              {impact && (
                <div style={{ color: "#6b7280", fontSize: 13, fontWeight: 600 }}>
                  {statusParts.join(" • ")}
                </div>
              )}
            </div>

            {analysisBlock ? (
              <div style={{ marginBottom: 14 }}>
                <InfoMessage type="warning">
                  {analysisBlock.message || t("eventDetailsPage.analysisBlockFallback")}
                </InfoMessage>

                <div className="impact-grid" style={{ marginTop: 12 }}>
                  <div className="detail-item">
                    <div className="detail-label">{t("eventDetailsPage.analysisBlockRequiredPeriod")}</div>
                    <div className="detail-value">{analysisBlock.required_event_period || "-"}</div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">{t("eventDetailsPage.analysisBlockAvailableEnds")}</div>
                    <div className="detail-value">{analysisBlock.available_data_ends || "-"}</div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">{t("eventDetailsPage.analysisBlockMissingPeriod")}</div>
                    <div className="detail-value">{analysisBlock.missing_period || "-"}</div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">{t("eventDetailsPage.analysisBlockHint")}</div>
                    <div className="detail-value">{analysisBlock.hint || "-"}</div>
                  </div>
                </div>
              </div>
            ) : analysis ? (
              <ImpactAnalysisDetails analysis={analysis} />
            ) : (
              <InfoMessage type="info">
                {t("eventDetailsPage.noAnalysisYet")}
              </InfoMessage>
            )}
          </Card>
        </>
      )}
    </div>
  );
}