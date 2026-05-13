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
  deleteEvent,
  dismissDraftEvent,
  getDraftEvents,
  getEvents,
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

const getEventTitle = (event, t) => {
  return (
    event?.event_name ||
    event?.event_name_ar ||
    event?.title ||
    event?.name ||
    t("eventsPage.eventFallbackName", {
      id: event?.event_id ?? "",
    })
  );
};

function DraftsSkeleton() {
  return (
    <div className="drafts-skeleton">
      {[0, 1, 2].map((index) => (
        <div key={index} className="drafts-sk-row">
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
  very_high: { labelKey: "impact.levels.very_high", cls: "dimp-veryhigh" },
  high: { labelKey: "impact.levels.high", cls: "dimp-high" },
  medium: { labelKey: "impact.levels.medium", cls: "dimp-medium" },
  low: { labelKey: "impact.levels.low", cls: "dimp-low" },
};

const impactMeta = (level, t) => {
  const key = String(level || "").toLowerCase();
  const meta = IMPACT_META[key];

  if (!meta) {
    return {
      label: level || "—",
      cls: "dimp-low",
    };
  }

  return {
    label: t(meta.labelKey),
    cls: meta.cls,
  };
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
    [selectedIds],
  );

  const dismissingSet = useMemo(
    () =>
      new Set(
        (Array.isArray(dismissingIds) ? dismissingIds : []).map(String),
      ),
    [dismissingIds],
  );

  const visibleIds = drafts.map((draft) => normalizeId(draft.event_id)).filter(Boolean);

  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedSet.has(id),
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
                aria-label={t("draftsTable.selectAll")}
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
            const meta = impactMeta(draft.max_impact_level, t);
            const checked = selectedSet.has(id);
            const dismissing = dismissingSet.has(id);

            const productNames = Array.isArray(draft.impacts)
              ? draft.impacts
                  .map((impact) => impact.product_name)
                  .filter(Boolean)
                  .join(", ")
              : "—";

            const suggestedTypeKey = String(
              draft.suggested_event_type || "",
            ).toLowerCase();

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
                    aria-label={t("draftsTable.selectOne")}
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
                    {suggestedTypeKey
                      ? t(`form.types.${suggestedTypeKey}`, {
                          defaultValue: draft.suggested_event_type || "—",
                        })
                      : "—"}
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

  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [activeDraft, setActiveDraft] = useState(null);

  const [selectedDraftIds, setSelectedDraftIds] = useState([]);
  const [dismissingIds, setDismissingIds] = useState([]);
  const [dismissConfirmDrafts, setDismissConfirmDrafts] = useState([]);

  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [deletingEventIds, setDeletingEventIds] = useState([]);
  const [deleteConfirmEvents, setDeleteConfirmEvents] = useState([]);

  const dismissing = dismissingIds.length > 0;
  const deleting = deletingEventIds.length > 0;

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
    const existing = new Set(drafts.map((draft) => normalizeId(draft.event_id)));

    setSelectedDraftIds((previous) =>
      previous.filter((id) => existing.has(String(id))),
    );
  }, [drafts]);

  useEffect(() => {
    const existing = new Set(events.map((event) => normalizeId(event.event_id)));

    setSelectedEventIds((previous) =>
      previous.filter((id) => existing.has(String(id))),
    );
  }, [events]);

  useEffect(() => {
    const draftId = searchParams.get("draftEvent");
    if (!draftId || draftsLoading) return;

    const found = drafts.find((draft) => String(draft.event_id) === String(draftId));

    if (found) {
      setActiveTab(TAB_DETECTED);
      setActiveDraft(found);

      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete("draftEvent");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, drafts, draftsLoading, setSearchParams]);

  const selectedDrafts = useMemo(() => {
    const set = new Set(selectedDraftIds.map(String));

    return drafts.filter((draft) => set.has(normalizeId(draft.event_id)));
  }, [drafts, selectedDraftIds]);

  const selectedEvents = useMemo(() => {
    const set = new Set(selectedEventIds.map(String));

    return events.filter((event) => set.has(normalizeId(event.event_id)));
  }, [events, selectedEventIds]);

  const selectedDraftCount = selectedDrafts.length;
  const selectedEventCount = selectedEvents.length;

  const dismissConfirmCount = dismissConfirmDrafts.length;
  const deleteConfirmCount = deleteConfirmEvents.length;

  const toggleOneDraft = (eventId, checked) => {
    if (dismissing) return;

    const id = normalizeId(eventId);
    if (!id) return;

    setSelectedDraftIds((previous) => {
      const set = new Set(previous.map(String));

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

    const ids = drafts.map((draft) => normalizeId(draft.event_id)).filter(Boolean);

    setSelectedDraftIds((previous) => {
      const set = new Set(previous.map(String));

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

    const targetIds = targets
      .map((draft) => normalizeId(draft.event_id))
      .filter(Boolean);

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

      setDrafts((previous) =>
        previous.filter(
          (draft) => !dismissedIds.includes(normalizeId(draft.event_id)),
        ),
      );

      setSelectedDraftIds((previous) =>
        previous.filter((id) => !dismissedIds.includes(String(id))),
      );

      if (failures.length === 0) {
        setNotice(
          t("eventsPage.dismissSelectedSuccess", {
            count: dismissedIds.length,
          }),
        );
      } else {
        const message = extractApiError(
          failures[0]?.err,
          t("draftModal.errorDismissFailed"),
        );

        setError(
          `${t("eventsPage.dismissSelectedPartialFailed", {
            failed: failures.length,
            total: targets.length,
          })} ${message}`,
        );
      }

      const remainingCount = drafts.filter(
        (draft) => !dismissedIds.includes(normalizeId(draft.event_id)),
      ).length;

      if (remainingCount <= 0) {
        setActiveTab(TAB_CONFIRMED);
      }
    } finally {
      setDismissingIds([]);
    }
  };

  const toggleOneEvent = (eventId, checked) => {
    if (deleting) return;

    const id = normalizeId(eventId);
    if (!id) return;

    setSelectedEventIds((previous) => {
      const set = new Set(previous.map(String));

      if (checked) {
        set.add(id);
      } else {
        set.delete(id);
      }

      return Array.from(set);
    });
  };

  const toggleAllEvents = (checked) => {
    if (deleting) return;

    const ids = events.map((event) => normalizeId(event.event_id)).filter(Boolean);

    setSelectedEventIds((previous) => {
      const set = new Set(previous.map(String));

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

  const clearEventSelection = () => {
    if (deleting) return;
    setSelectedEventIds([]);
  };

  const requestDeleteEvents = (targets = []) => {
    if (deleting) return;

    const list =
      Array.isArray(targets) && targets.length > 0 ? targets : selectedEvents;

    if (list.length === 0) return;

    setDeleteConfirmEvents(list);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeleteConfirmEvents([]);
  };

  const deleteConfirmedEvents = async (eventsToDelete = []) => {
    const targets =
      Array.isArray(eventsToDelete) && eventsToDelete.length > 0
        ? eventsToDelete
        : selectedEvents;

    if (targets.length === 0 || deleting) return;

    const targetIds = targets
      .map((event) => normalizeId(event.event_id))
      .filter(Boolean);

    const deletedIds = [];
    const failures = [];

    setDeleteConfirmEvents([]);
    setError("");
    setNotice("");
    setDeletingEventIds(targetIds);

    try {
      for (const event of targets) {
        try {
          await deleteEvent(event.event_id);
          deletedIds.push(normalizeId(event.event_id));
        } catch (err) {
          failures.push({ event, err });
        }
      }

      setEvents((previous) =>
        previous.filter(
          (event) => !deletedIds.includes(normalizeId(event.event_id)),
        ),
      );

      setSelectedEventIds((previous) =>
        previous.filter((id) => !deletedIds.includes(String(id))),
      );

      if (failures.length === 0) {
        setNotice(
          t("eventsPage.deleteSelectedSuccess", {
            count: deletedIds.length,
          }),
        );
      } else {
        const message = extractApiError(
          failures[0]?.err,
          t("eventsPage.deleteSelectedFailed"),
        );

        setError(
          `${t("eventsPage.deleteSelectedPartialFailed", {
            failed: failures.length,
            total: targets.length,
          })} ${message}`,
        );
      }
    } finally {
      setDeletingEventIds([]);
    }
  };

  const handleDraftConfirmed = (res, draftEvent) => {
    setNotice(
      res?.message ||
        t("eventsPage.draftConfirmedNotice", {
          name: res?.event_name || "",
        }),
    );

    const next = drafts.filter((draft) => draft.event_id !== draftEvent.event_id);

    setDrafts(next);
    setSelectedDraftIds((previous) =>
      previous.filter((id) => String(id) !== String(draftEvent.event_id)),
    );

    if (next.length === 0) setActiveTab(TAB_CONFIRMED);

    load();
    setTimeout(() => setActiveDraft(null), 900);
  };

  const handleDraftDismissed = (_res, draftEvent) => {
    const next = drafts.filter((draft) => draft.event_id !== draftEvent.event_id);

    setDrafts(next);
    setSelectedDraftIds((previous) =>
      previous.filter((id) => String(id) !== String(draftEvent.event_id)),
    );

    if (next.length === 0) setActiveTab(TAB_CONFIRMED);

    setTimeout(() => setActiveDraft(null), 800);
  };

  const draftCount = drafts.length;

  const headerActions = useMemo(
    () => (
      <div className="events-actions">
        <PageHelp
          title={t("eventsPage.pageHelp.title")}
          buttonLabel={t("eventsPage.pageHelp.buttonLabel")}
          items={[
            {
              title: t("eventsPage.pageHelp.items.startTitle"),
              description: t("eventsPage.pageHelp.items.startDescription"),
            },
            {
              title: t("eventsPage.pageHelp.items.reviewTitle"),
              description: t("eventsPage.pageHelp.items.reviewDescription"),
            },
            {
              title: t("eventsPage.pageHelp.items.dismissTitle"),
              description: t("eventsPage.pageHelp.items.dismissDescription"),
            },
            {
              title: t("eventsPage.pageHelp.items.confirmedTitle"),
              description: t("eventsPage.pageHelp.items.confirmedDescription"),
            },
            {
              title: t("eventsPage.pageHelp.items.manualTitle"),
              description: t("eventsPage.pageHelp.items.manualDescription"),
            },
            {
              title: t("eventsPage.pageHelp.items.deleteTitle"),
              description: t("eventsPage.pageHelp.items.deleteDescription"),
            },
          ]}
          note={t("eventsPage.pageHelp.note")}
        />

        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/app/calendar")}
        >
          {t("eventsPage.btnViewCalendar")}
        </Button>

        <Button type="button" onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? t("eventsPage.btnClose") : t("eventsPage.btnCreateEvent")}
        </Button>
      </div>
    ),
    [navigate, showCreate, t],
  );

  const deleteConfirmTitle =
    deleteConfirmCount === 1
      ? t("eventsPage.deleteConfirmTitleOne")
      : t("eventsPage.deleteConfirmTitleMany");

  const deleteConfirmMessage =
    deleteConfirmCount === 1
      ? t("eventsPage.deleteConfirmMessageOne", {
          name: getEventTitle(deleteConfirmEvents[0], t),
        })
      : t("eventsPage.deleteConfirmMessageMany", {
          count: deleteConfirmCount,
        });

  const deleteConfirmAction =
    deleteConfirmCount === 1
      ? t("eventsPage.deleteConfirmActionOne")
      : t("eventsPage.deleteConfirmActionMany", {
          count: deleteConfirmCount,
        });

  return (
    <div className="events-page">
      <PageHeader actions={headerActions} />

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
            onSuccess={(message) => {
              setNotice(message || t("eventsPage.noticeCreated"));
              setShowCreate(false);
              load();
            }}
            onError={(message) =>
              setError(message || t("eventsPage.errorCreateFailed"))
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
              {t("eventsPage.tabDetected")}

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
                ? t("eventsPage.tabUpcomingConfirmed")
                : t("eventsPage.tabConfirmed")}
            </button>

            {activeTab === TAB_CONFIRMED && (
              <div className="ev-tabs-right">
                <div className="events-toggle">
                  <button
                    type="button"
                    className={`seg-btn ${!upcoming ? "active" : ""}`}
                    onClick={() => setUpcoming(false)}
                  >
                    {t("eventsPage.btnAllConfirmed")}
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
                  ? t("eventsPage.detectedCardTitle")
                  : draftCount > 0
                    ? t("eventsPage.detectedCardTitleCount", {
                        count: draftCount,
                      })
                    : t("eventsPage.detectedCardTitleEmpty")
              }
              subtitle={t("eventsPage.detectedCardSub")}
            >
              {draftsLoading ? (
                <DraftsSkeleton />
              ) : draftCount === 0 ? (
                <div className="events-empty">
                  <div className="events-empty-title">
                    {t("eventsPage.detectedEmptyTitle")}
                  </div>

                  <div className="events-empty-subtitle">
                    {t("eventsPage.detectedEmptySubtitle")}
                  </div>
                </div>
              ) : (
                <>
                  {selectedDraftCount > 0 && (
                    <div className="drafts-selection-bar">
                      <div className="drafts-selection-text">
                        {t("eventsPage.detectedSelected", {
                          count: selectedDraftCount,
                        })}
                      </div>

                      <div className="drafts-selection-actions">
                        <button
                          type="button"
                          className="drafts-secondary-btn"
                          onClick={clearDraftSelection}
                          disabled={dismissing}
                        >
                          {t("eventsPage.clearSelection")}
                        </button>

                        <button
                          type="button"
                          className="drafts-dismiss-selected-btn"
                          onClick={requestDismissSelectedDrafts}
                          disabled={dismissing}
                        >
                          {dismissing
                            ? t("eventsPage.dismissingSelected")
                            : t("eventsPage.dismissSelected", {
                                count: selectedDraftCount,
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
                  ? t("eventsPage.cardTitleUpcomingConfirmed")
                  : t("eventsPage.cardTitleConfirmed")
              }
              subtitle={t("eventsPage.confirmedCardSubtitle")}
            >
              {loading ? (
                <EventsListSkeleton />
              ) : events.length === 0 ? (
                <div className="events-empty">
                  <div className="events-empty-title">
                    {t("eventsPage.emptyConfirmedTitle")}
                  </div>

                  <div className="events-empty-subtitle">
                    {t("eventsPage.emptyConfirmedSubtitle")}
                  </div>
                </div>
              ) : (
                <>
                  {selectedEventCount > 0 && (
                    <div className="confirmed-selection-bar">
                      <div className="confirmed-selection-text">
                        {t("eventsPage.confirmedSelected", {
                          count: selectedEventCount,
                        })}
                      </div>

                      <div className="confirmed-selection-actions">
                        <button
                          type="button"
                          className="confirmed-secondary-btn"
                          onClick={clearEventSelection}
                          disabled={deleting}
                        >
                          {t("eventsPage.clearSelection")}
                        </button>

                        <button
                          type="button"
                          className="confirmed-delete-selected-btn"
                          onClick={() => requestDeleteEvents()}
                          disabled={deleting}
                        >
                          {deleting
                            ? t("eventsPage.deletingSelected")
                            : t("eventsPage.deleteSelected", {
                                count: selectedEventCount,
                              })}
                        </button>
                      </div>
                    </div>
                  )}

                  <EventsTable
                    events={events}
                    onOpen={(id) => navigate(`/app/events/${id}`)}
                    selectable
                    selectedIds={selectedEventIds}
                    deletingIds={deletingEventIds}
                    onToggleOne={toggleOneEvent}
                    onToggleAll={toggleAllEvents}
                    onDeleteOne={(event) => requestDeleteEvents([event])}
                    selectionDisabled={deleting}
                  />
                </>
              )}
            </Card>
          )}
        </>
      )}

      {dismissConfirmCount > 0 && (
        <ConfirmDialog
          title={t("eventsPage.dismissConfirmTitle")}
          message={t("eventsPage.dismissConfirmMessage", {
            count: dismissConfirmCount,
          })}
          cancelLabel={t("eventsPage.dismissConfirmCancel")}
          confirmLabel={t("eventsPage.dismissConfirmAction", {
            count: dismissConfirmCount,
          })}
          onCancel={closeDismissConfirm}
          onConfirm={() => dismissSelectedDrafts(dismissConfirmDrafts)}
        />
      )}

      {deleteConfirmCount > 0 && (
        <ConfirmDialog
          title={deleteConfirmTitle}
          message={deleteConfirmMessage}
          cancelLabel={t("eventsPage.deleteConfirmCancel")}
          confirmLabel={deleteConfirmAction}
          onCancel={closeDeleteConfirm}
          onConfirm={() => deleteConfirmedEvents(deleteConfirmEvents)}
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