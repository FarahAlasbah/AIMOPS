// frontend/src/features/events/pages/EventsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  PageHeader,
  InfoMessage,
} from "../../../shared/components";
import PageHelp from "../../../shared/components/PageHelp";
import {
  getEvents,
  getDraftEvents,
  dismissDraftEvent,
} from "../../../api/events";
import EventForm from "../components/EventForm";
import EventsTable from "../components/EventsTable";
import DraftEventModal from "../components/DraftEventModal";
import { EventsListSkeleton } from "../components/Skeletons";
import "./Events.css";

const TAB_DETECTED = "detected";
const TAB_CONFIRMED = "confirmed";

const normalizeId = (id) => String(id ?? "").trim();

const isConfirmedEvent = (event) => {
  const status = String(event?.status || "").trim().toLowerCase();
  return status === "confirmed";
};

const extractApiError = (err, fallback) => {
  const data = err?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  if (typeof err?.message === "string") return err.message;

  if (data?.detail && typeof data.detail === "object") {
    if (typeof data.detail.message === "string") return data.detail.message;

    try {
      return JSON.stringify(data.detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

function DraftsSkeleton() {
  return (
    <div className="drafts-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="drafts-sk-row">
          <div className="drafts-sk-cell drafts-sk-check" />
          <div className="drafts-sk-cell drafts-sk-wide" />
          <div className="drafts-sk-cell drafts-sk-mid" />
          <div className="drafts-sk-cell drafts-sk-short" />
          <div className="drafts-sk-cell drafts-sk-short" />
          <div className="drafts-sk-cell drafts-sk-btn" />
        </div>
      ))}
    </div>
  );
}

const IMPACT_META = {
  very_high: { label: "Very High", cls: "dimp-veryhigh" },
  high: { label: "High", cls: "dimp-high" },
  medium: { label: "Medium", cls: "dimp-medium" },
  low: { label: "Low", cls: "dimp-low" },
};

const impactMeta = (level) =>
  IMPACT_META[String(level || "").toLowerCase()] || {
    label: level || "—",
    cls: "dimp-low",
  };

function DraftsTable({
  drafts,
  selectedIds,
  dismissingIds,
  onToggleOne,
  onToggleAll,
  onReview,
}) {
  const { t } = useTranslation("events");

  const selectedSet = useMemo(
    () => new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String)),
    [selectedIds]
  );

  const dismissingSet = useMemo(
    () =>
      new Set(
        (Array.isArray(dismissingIds) ? dismissingIds : []).map(String)
      ),
    [dismissingIds]
  );

  const visibleIds = drafts.map((d) => normalizeId(d.event_id)).filter(Boolean);

  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedSet.has(id)
  ).length;

  const allSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const someSelected =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;

  return (
    <div className="drafts-table-wrap">
      <table className="drafts-table">
        <thead>
          <tr>
            <th style={{ width: "44px" }}>
              <input
                type="checkbox"
                className="drafts-checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={(e) => onToggleAll?.(e.target.checked)}
                aria-label={t("draftsTable.selectAll", {
                  defaultValue: "Select all detected events",
                })}
              />
            </th>

            <th style={{ width: "28%" }}>{t("draftsTable.colPeriod")}</th>
            <th style={{ width: "24%" }}>{t("draftsTable.colProducts")}</th>
            <th style={{ width: "16%" }}>{t("draftsTable.colImpact")}</th>
            <th style={{ width: "14%" }}>{t("draftsTable.colType")}</th>
            <th style={{ width: "18%" }} />
          </tr>
        </thead>

        <tbody>
          {drafts.map((draft) => {
            const id = normalizeId(draft.event_id);
            const meta = impactMeta(draft.max_impact_level);
            const checked = selectedSet.has(id);
            const dismissing = dismissingSet.has(id);

            const productNames = Array.isArray(draft.impacts)
              ? draft.impacts
                  .map((i) => i.product_name)
                  .filter(Boolean)
                  .join(", ")
              : "—";

            return (
              <tr
                key={draft.event_id}
                className={`drafts-row ${
                  checked ? "drafts-row-selected" : ""
                } ${dismissing ? "drafts-row-busy" : ""}`}
              >
                <td>
                  <input
                    type="checkbox"
                    className="drafts-checkbox"
                    checked={checked}
                    disabled={dismissing}
                    onChange={(e) =>
                      onToggleOne?.(draft.event_id, e.target.checked)
                    }
                    aria-label={t("draftsTable.selectOne", {
                      defaultValue: "Select detected event",
                    })}
                  />
                </td>

                <td>
                  <div className="drafts-dates">
                    {draft.start_date} – {draft.end_date}
                  </div>

                  {draft.duration_days && (
                    <div className="drafts-duration">
                      {t("draftsTable.durationDays", {
                        count: draft.duration_days,
                      })}
                    </div>
                  )}
                </td>

                <td>
                  <div className="drafts-products" title={productNames}>
                    {productNames || "—"}
                  </div>
                </td>

                <td>
                  <span className={`drafts-impact-pill ${meta.cls}`}>
                    {meta.label}
                  </span>
                </td>

                <td>
                  <span className="drafts-type">
                    {draft.suggested_event_type || "—"}
                  </span>
                </td>

                <td>
                  <button
                    type="button"
                    className="drafts-review-btn"
                    onClick={() => onReview(draft)}
                    disabled={dismissing}
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

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      className="ev-confirm-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="ev-confirm-modal">
        <div className="ev-confirm-icon">!</div>

        <div className="ev-confirm-title">{title}</div>
        <div className="ev-confirm-message">{message}</div>

        <div className="ev-confirm-actions">
          <button
            type="button"
            className="ev-confirm-cancel-btn"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="ev-confirm-primary-btn"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { t } = useTranslation("events");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(TAB_DETECTED);
  const [upcoming, setUpcoming] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [events, setEvents] = useState([]);
  const [dismissConfirmDrafts, setDismissConfirmDrafts] = useState([]);

  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [activeDraft, setActiveDraft] = useState(null);

  const [selectedDraftIds, setSelectedDraftIds] = useState([]);
  const [dismissingIds, setDismissingIds] = useState([]);

  const dismissing = dismissingIds.length > 0;

  async function load() {
    setLoading(true);
    setError("");

    try {
      const data = await getEvents({ upcoming });
      const allEvents = Array.isArray(data?.events) ? data.events : [];

      const confirmedEvents = allEvents.filter(isConfirmedEvent);
      setEvents(confirmedEvents);
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

      if (list.length === 0) {
        setActiveTab(TAB_CONFIRMED);
      }
    } catch {
      setDrafts([]);
      setActiveTab(TAB_CONFIRMED);
    } finally {
      setDraftsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming]);

  useEffect(() => {
    loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const existing = new Set(drafts.map((d) => normalizeId(d.event_id)));

    setSelectedDraftIds((prev) =>
      prev.filter((id) => existing.has(String(id)))
    );
  }, [drafts]);

  useEffect(() => {
    const draftId = searchParams.get("draftEvent");
    if (!draftId || draftsLoading) return;

    const found = drafts.find((d) => String(d.event_id) === String(draftId));

    if (found) {
      setActiveTab(TAB_DETECTED);
      setActiveDraft(found);

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("draftEvent");
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, drafts, draftsLoading, setSearchParams]);

  const selectedDrafts = useMemo(() => {
    const set = new Set(selectedDraftIds.map(String));

    return drafts.filter((draft) => set.has(normalizeId(draft.event_id)));
  }, [drafts, selectedDraftIds]);

  const selectedDraftCount = selectedDrafts.length;
  const dismissConfirmCount = dismissConfirmDrafts.length;

  const toggleOneDraft = (eventId, checked) => {
    if (dismissing) return;

    const id = normalizeId(eventId);
    if (!id) return;

    setSelectedDraftIds((prev) => {
      const set = new Set(prev.map(String));

      if (checked) {
        set.add(id);
      } else {
        set.delete(id);
      }

      return Array.from(set);
    });
  };

  const toggleAllDrafts = (checked) => {
    if (dismissing) return;

    const ids = drafts.map((d) => normalizeId(d.event_id)).filter(Boolean);

    setSelectedDraftIds((prev) => {
      const set = new Set(prev.map(String));

      ids.forEach((id) => {
        if (checked) {
          set.add(id);
        } else {
          set.delete(id);
        }
      });

      return Array.from(set);
    });
  };

  const clearDraftSelection = () => {
    if (dismissing) return;
    setSelectedDraftIds([]);
  };

  const requestDismissSelectedDrafts = () => {
    if (selectedDrafts.length === 0 || dismissing) return;
    setDismissConfirmDrafts(selectedDrafts);
  };

  const closeDismissConfirm = () => {
    if (dismissing) return;
    setDismissConfirmDrafts([]);
  };

  const dismissSelectedDrafts = async (draftsToDismiss = []) => {
    const targets =
      Array.isArray(draftsToDismiss) && draftsToDismiss.length > 0
        ? draftsToDismiss
        : selectedDrafts;

    if (targets.length === 0 || dismissing) return;

    const targetIds = targets.map((d) => normalizeId(d.event_id)).filter(Boolean);

    const dismissedIds = [];
    const failures = [];

    setDismissConfirmDrafts([]);
    setError("");
    setNotice("");
    setDismissingIds(targetIds);

    try {
      for (const draft of targets) {
        try {
          await dismissDraftEvent(draft.event_id);
          dismissedIds.push(normalizeId(draft.event_id));
        } catch (err) {
          failures.push({ draft, err });
        }
      }

      setDrafts((prev) =>
        prev.filter(
          (draft) => !dismissedIds.includes(normalizeId(draft.event_id))
        )
      );

      setSelectedDraftIds((prev) =>
        prev.filter((id) => !dismissedIds.includes(String(id)))
      );

      if (failures.length === 0) {
        setNotice(
          t("eventsPage.dismissSelectedSuccess", {
            count: dismissedIds.length,
            defaultValue: `${dismissedIds.length} detected event(s) dismissed.`,
          })
        );
      } else {
        const message = extractApiError(
          failures[0]?.err,
          t("draftModal.errorDismissFailed", {
            defaultValue: "Failed to dismiss detected event.",
          })
        );

        setError(
          t("eventsPage.dismissSelectedPartialFailed", {
            failed: failures.length,
            total: targets.length,
            defaultValue: `${failures.length} of ${targets.length} detected event(s) could not be dismissed.`,
          }) + ` ${message}`
        );
      }

      const remainingCount = drafts.filter(
        (draft) => !dismissedIds.includes(normalizeId(draft.event_id))
      ).length;

      if (remainingCount <= 0) {
        setActiveTab(TAB_CONFIRMED);
      }
    } finally {
      setDismissingIds([]);
    }
  };

  const handleDraftConfirmed = (res, draftEvent) => {
    setNotice(
      res?.message ||
        t("eventsPage.draftConfirmedNotice", {
          name: res?.event_name || "",
        })
    );

    const next = drafts.filter((d) => d.event_id !== draftEvent.event_id);

    setDrafts(next);
    setSelectedDraftIds((prev) =>
      prev.filter((id) => String(id) !== String(draftEvent.event_id))
    );

    if (next.length === 0) setActiveTab(TAB_CONFIRMED);

    load();
    setTimeout(() => setActiveDraft(null), 900);
  };

  const handleDraftDismissed = (_res, draftEvent) => {
    const next = drafts.filter((d) => d.event_id !== draftEvent.event_id);

    setDrafts(next);
    setSelectedDraftIds((prev) =>
      prev.filter((id) => String(id) !== String(draftEvent.event_id))
    );

    if (next.length === 0) setActiveTab(TAB_CONFIRMED);

    setTimeout(() => setActiveDraft(null), 800);
  };

  const draftCount = drafts.length;

  const headerActions = useMemo(
    () => (
      <div className="events-actions">
        <PageHelp
          title="How to use Events"
          buttonLabel="Open events help"
          items={[
            {
              title: "1. Start with detected events",
              description:
                "Detected events are suggestions found by AIMOPS from your sales data. Review them before adding them to the official events list.",
            },
            {
              title: "2. Review before confirming",
              description:
                "Click Review to see the detected event period, affected products, and impact level. Confirm only the events that are useful for the business.",
            },
            {
              title: "3. Dismiss unwanted detections",
              description:
                "If a detected event is not useful, select it and dismiss it. Dismissed detections are removed from the review list.",
            },
            {
              title: "4. Use confirmed events for planning",
              description:
                "Confirmed events are the official business events. They can be used for calendar planning and impact analysis.",
            },
            {
              title: "5. Create events manually",
              description:
                "Use Create Event when you already know an important occasion, campaign-related date, season, or business event.",
            },
            {
              title: "6. Delete carefully",
              description:
                "Delete confirmed events only when they are wrong or no longer needed, because removing them can affect event tracking and future analysis.",
            },
          ]}
          note="Tip: Detected events are suggestions. Confirmed events are the ones AIMOPS treats as real business events."
        />

        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/app/calendar")}
        >
          {t("eventsPage.btnViewCalendar")}
        </Button>

        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? t("eventsPage.btnClose") : t("eventsPage.btnCreateEvent")}
        </Button>
      </div>
    ),
    [navigate, showCreate, t]
  );

  return (
    <div className="events-page">
      <PageHeader
        
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
            onError={(msg) =>
              setError(msg || t("eventsPage.errorCreateFailed"))
            }
          />
        </Card>
      )}

      {!showCreate && (
        <>
          <div className="ev-tabs">
            <button
              type="button"
              className={`ev-tab ${
                activeTab === TAB_DETECTED ? "ev-tab-active" : ""
              }`}
              onClick={() => setActiveTab(TAB_DETECTED)}
            >
              {t("eventsPage.tabDetected", {
                defaultValue: "Detected events",
              })}

              {draftsLoading ? (
                <span className="ev-tab-spinner" />
              ) : draftCount > 0 ? (
                <span className="ev-tab-badge">{draftCount}</span>
              ) : null}
            </button>

            <button
              type="button"
              className={`ev-tab ${
                activeTab === TAB_CONFIRMED ? "ev-tab-active" : ""
              }`}
              onClick={() => setActiveTab(TAB_CONFIRMED)}
            >
              {upcoming
                ? t("eventsPage.tabUpcomingConfirmed", {
                    defaultValue: "Upcoming confirmed",
                  })
                : t("eventsPage.tabConfirmed", {
                    defaultValue: "Confirmed events",
                  })}
            </button>

            {activeTab === TAB_CONFIRMED && (
              <div className="ev-tabs-right">
                <div className="events-toggle">
                  <button
                    type="button"
                    className={`seg-btn ${!upcoming ? "active" : ""}`}
                    onClick={() => setUpcoming(false)}
                  >
                    {t("eventsPage.btnAllConfirmed", {
                      defaultValue: "All confirmed",
                    })}
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

          {activeTab === TAB_DETECTED && (
            <Card
              title={
                draftsLoading
                  ? t("eventsPage.detectedCardTitle", {
                      defaultValue: "Detected events",
                    })
                  : draftCount > 0
                    ? t("eventsPage.detectedCardTitleCount", {
                        count: draftCount,
                        defaultValue: `${draftCount} detected event(s)`,
                      })
                    : t("eventsPage.detectedCardTitleEmpty", {
                        defaultValue: "No detected events",
                      })
              }
              subtitle={t("eventsPage.detectedCardSub", {
                defaultValue:
                  "Review AI-detected events. Confirm useful ones or dismiss the ones you do not need.",
              })}
            >
              {draftsLoading ? (
                <DraftsSkeleton />
              ) : draftCount === 0 ? (
                <div className="events-empty">
                  <div className="events-empty-title">
                    {t("eventsPage.detectedEmptyTitle", {
                      defaultValue: "No detected events",
                    })}
                  </div>

                  <div className="events-empty-subtitle">
                    {t("eventsPage.detectedEmptySubtitle", {
                      defaultValue:
                        "When AIMOPS detects possible events from your sales data, they will appear here.",
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {selectedDraftCount > 0 && (
                    <div className="drafts-selection-bar">
                      <div className="drafts-selection-text">
                        {t("eventsPage.detectedSelected", {
                          count: selectedDraftCount,
                          defaultValue: `${selectedDraftCount} selected`,
                        })}
                      </div>

                      <div className="drafts-selection-actions">
                        <button
                          type="button"
                          className="drafts-secondary-btn"
                          onClick={clearDraftSelection}
                          disabled={dismissing}
                        >
                          {t("eventsPage.clearSelection", {
                            defaultValue: "Clear selection",
                          })}
                        </button>

                        <button
                          type="button"
                          className="drafts-dismiss-selected-btn"
                          onClick={requestDismissSelectedDrafts}
                          disabled={dismissing}
                        >
                          {dismissing
                            ? t("eventsPage.dismissingSelected", {
                                defaultValue: "Dismissing...",
                              })
                            : t("eventsPage.dismissSelected", {
                                count: selectedDraftCount,
                                defaultValue: `Dismiss selected (${selectedDraftCount})`,
                              })}
                        </button>
                      </div>
                    </div>
                  )}

                  <DraftsTable
                    drafts={drafts}
                    selectedIds={selectedDraftIds}
                    dismissingIds={dismissingIds}
                    onToggleOne={toggleOneDraft}
                    onToggleAll={toggleAllDrafts}
                    onReview={setActiveDraft}
                  />
                </>
              )}
            </Card>
          )}

          {activeTab === TAB_CONFIRMED && (
            <Card
              title={
                upcoming
                  ? t("eventsPage.cardTitleUpcomingConfirmed", {
                      defaultValue: "Upcoming confirmed events",
                    })
                  : t("eventsPage.cardTitleConfirmed", {
                      defaultValue: "Confirmed events",
                    })
              }
              subtitle={t("eventsPage.confirmedCardSubtitle", {
                defaultValue:
                  "Only confirmed events are shown here. Detected events stay in the detected tab until confirmed or dismissed.",
              })}
            >
              {loading ? (
                <EventsListSkeleton />
              ) : events.length === 0 ? (
                <div className="events-empty">
                  <div className="events-empty-title">
                    {t("eventsPage.emptyConfirmedTitle", {
                      defaultValue: "No confirmed events yet",
                    })}
                  </div>

                  <div className="events-empty-subtitle">
                    {t("eventsPage.emptyConfirmedSubtitle", {
                      defaultValue:
                        "Confirmed events will appear here after you create or confirm them.",
                    })}
                  </div>
                </div>
              ) : (
                <EventsTable
                  events={events}
                  onOpen={(id) => navigate(`/app/events/${id}`)}
                />
              )}
            </Card>
          )}
        </>
      )}

      {dismissConfirmCount > 0 && (
        <ConfirmDialog
          title={t("eventsPage.dismissConfirmTitle", {
            defaultValue: "Dismiss detected events?",
          })}
          message={t("eventsPage.dismissConfirmMessage", {
            count: dismissConfirmCount,
            defaultValue: `This will remove ${dismissConfirmCount} selected detected event(s) from the review list. This action cannot be undone.`,
          })}
          cancelLabel={t("eventsPage.dismissConfirmCancel", {
            defaultValue: "Cancel",
          })}
          confirmLabel={t("eventsPage.dismissConfirmAction", {
            count: dismissConfirmCount,
            defaultValue: `Dismiss ${dismissConfirmCount}`,
          })}
          onCancel={closeDismissConfirm}
          onConfirm={() => dismissSelectedDrafts(dismissConfirmDrafts)}
        />
      )}

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