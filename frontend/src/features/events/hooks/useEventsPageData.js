import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deleteEvent,
  dismissDraftEvent,
  getDraftEvents,
  getEvents,
} from "../../../api/events";
import { useLatestValueRef } from "./useLatestValueRef";
import {
  extractApiError,
  isConfirmedEvent,
  normalizeId,
  TAB_CONFIRMED,
  TAB_DETECTED,
} from "../utils/eventsPageUtils";

export function useEventsPageData({ searchParams, setSearchParams }) {
  const { t } = useTranslation("events");
  const tRef = useLatestValueRef(t);

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

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getEvents({ upcoming });
      const allEvents = Array.isArray(data?.events) ? data.events : [];
      const confirmedEvents = allEvents.filter(isConfirmedEvent);

      setEvents(confirmedEvents);
    } catch (e) {
      setEvents([]);
      setError(e?.message || tRef.current("eventsPage.errorLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [upcoming, tRef]);

  const loadDrafts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

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

    const found = drafts.find(
      (draft) => String(draft.event_id) === String(draftId),
    );

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

      setDrafts((previous) => {
        const next = previous.filter(
          (draft) => !dismissedIds.includes(normalizeId(draft.event_id)),
        );

        if (next.length === 0) {
          setActiveTab(TAB_CONFIRMED);
        }

        return next;
      });

      setSelectedDraftIds((previous) =>
        previous.filter((id) => !dismissedIds.includes(String(id))),
      );

      if (failures.length === 0) {
        setNotice(
          tRef.current("eventsPage.dismissSelectedSuccess", {
            count: dismissedIds.length,
          }),
        );
      } else {
        const message = extractApiError(
          failures[0]?.err,
          tRef.current("draftModal.errorDismissFailed"),
        );

        setError(
          `${tRef.current("eventsPage.dismissSelectedPartialFailed", {
            failed: failures.length,
            total: targets.length,
          })} ${message}`,
        );
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
          tRef.current("eventsPage.deleteSelectedSuccess", {
            count: deletedIds.length,
          }),
        );
      } else {
        const message = extractApiError(
          failures[0]?.err,
          tRef.current("eventsPage.deleteSelectedFailed"),
        );

        setError(
          `${tRef.current("eventsPage.deleteSelectedPartialFailed", {
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
        tRef.current("eventsPage.draftConfirmedNotice", {
          name: res?.event_name || "",
        }),
    );

    setDrafts((previous) => {
      const next = previous.filter(
        (draft) => draft.event_id !== draftEvent.event_id,
      );

      if (next.length === 0) {
        setActiveTab(TAB_CONFIRMED);
      }

      return next;
    });

    setSelectedDraftIds((previous) =>
      previous.filter((id) => String(id) !== String(draftEvent.event_id)),
    );

    loadEvents();
    setTimeout(() => setActiveDraft(null), 900);
  };

  const handleDraftDismissed = (_res, draftEvent) => {
    setDrafts((previous) => {
      const next = previous.filter(
        (draft) => draft.event_id !== draftEvent.event_id,
      );

      if (next.length === 0) {
        setActiveTab(TAB_CONFIRMED);
      }

      return next;
    });

    setSelectedDraftIds((previous) =>
      previous.filter((id) => String(id) !== String(draftEvent.event_id)),
    );

    setTimeout(() => setActiveDraft(null), 800);
  };

  const handleManualEventCreated = (message) => {
    setNotice(message || tRef.current("eventsPage.noticeCreated"));
    setShowCreate(false);
    loadEvents();
  };

  const handleManualEventError = (message) => {
    setError(message || tRef.current("eventsPage.errorCreateFailed"));
  };

  return {
    activeTab,
    setActiveTab,
    upcoming,
    setUpcoming,
    showCreate,
    setShowCreate,

    loading,
    saving,
    setSaving,
    error,
    notice,
    events,

    drafts,
    draftsLoading,
    activeDraft,
    setActiveDraft,

    selectedDraftIds,
    selectedDraftCount: selectedDrafts.length,
    dismissingIds,
    dismissing,
    dismissConfirmDrafts,
    dismissConfirmCount: dismissConfirmDrafts.length,

    selectedEventIds,
    selectedEventCount: selectedEvents.length,
    deletingEventIds,
    deleting,
    deleteConfirmEvents,
    deleteConfirmCount: deleteConfirmEvents.length,

    loadEvents,

    toggleOneDraft,
    toggleAllDrafts,
    clearDraftSelection,
    requestDismissSelectedDrafts,
    closeDismissConfirm,
    dismissSelectedDrafts,

    toggleOneEvent,
    toggleAllEvents,
    clearEventSelection,
    requestDeleteEvents,
    closeDeleteConfirm,
    deleteConfirmedEvents,

    handleDraftConfirmed,
    handleDraftDismissed,
    handleManualEventCreated,
    handleManualEventError,
  };
}