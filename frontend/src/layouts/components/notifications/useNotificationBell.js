import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../../shared/contexts/AuthContext";
import { getUsers } from "../../../api/users";
import {
  broadcastNotification,
  deleteNotification,
  getMyNotifications,
  getUpcomingReminders,
  markNotificationRead,
  sendNotificationToUser,
} from "../../../api/notifications";

import {
  dedupeById,
  HIDDEN_REMINDERS_KEY,
  loadSet,
  normalizeNotif,
  saveSet,
  SEEN_REMINDERS_KEY,
} from "./notificationBellUtils";

export function useNotificationBell() {
  const { t, i18n } = useTranslation("common");
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const isAdmin =
    user?.role === "admin" ||
    user?.role_name === "admin" ||
    user?.role?.name === "admin" ||
    user?.role?.key === "admin" ||
    hasPermission?.("notifications.create");

  const rootRef = useRef(null);
  const scrollRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reminders");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [reminders, setReminders] = useState([]);
  const [inbox, setInbox] = useState([]);

  const [reminderStorageTick, setReminderStorageTick] = useState(0);

  const [selectedNotification, setSelectedNotification] = useState(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState([]);

  const [targetMode, setTargetMode] = useState("all");
  const [targetRole, setTargetRole] = useState("");
  const [targetUserId, setTargetUserId] = useState("");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("system");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [remindersResponse, notificationsResponse] = await Promise.all([
        getUpcomingReminders().catch(() => null),
        getMyNotifications().catch(() => []),
      ]);

      const reminderList = Array.isArray(remindersResponse?.reminders)
        ? remindersResponse.reminders
        : [];

      const notificationList = Array.isArray(notificationsResponse)
        ? notificationsResponse
        : [];

      setReminders(reminderList);
      setInbox(dedupeById(notificationList.map(normalizeNotif)));
    } catch {
      setLoadError(t("notifications.loadError"));
      setReminders([]);
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAll();

    const intervalId = window.setInterval(fetchAll, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchAll]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    scrollRef.current?.scrollTo?.({
      top: 0,
      behavior: "smooth",
    });
  }, [activeTab, open]);

  const visibleReminders = useMemo(() => {
    const hidden = loadSet(HIDDEN_REMINDERS_KEY);

    return reminders.filter((reminder) => {
      return !hidden.has(String(reminder?.original_event_id));
    });
  }, [reminders, reminderStorageTick]);

  const visibleInbox = useMemo(() => {
    return inbox;
  }, [inbox]);

  const markOneReminderSeen = (eventId) => {
    if (eventId == null) return;

    const seen = loadSet(SEEN_REMINDERS_KEY);
    const key = String(eventId);

    if (seen.has(key)) return;

    seen.add(key);
    saveSet(SEEN_REMINDERS_KEY, seen);
    setReminderStorageTick((value) => value + 1);
  };

  useEffect(() => {
    if (!open || activeTab !== "reminders") return;

    const seenReminders = loadSet(SEEN_REMINDERS_KEY);
    let changed = false;

    for (const reminder of visibleReminders) {
      if (reminder?.original_event_id != null) {
        const id = String(reminder.original_event_id);

        if (!seenReminders.has(id)) {
          seenReminders.add(id);
          changed = true;
        }
      }
    }

    if (changed) {
      saveSet(SEEN_REMINDERS_KEY, seenReminders);
      setReminderStorageTick((value) => value + 1);
    }
  }, [open, activeTab, visibleReminders]);

  const unseen = useMemo(() => {
    const seenReminders = loadSet(SEEN_REMINDERS_KEY);

    let inboxUnseen = 0;
    let remindersUnseen = 0;

    for (const notification of visibleInbox) {
      if (!notification?.isRead) inboxUnseen += 1;
    }

    for (const reminder of visibleReminders) {
      const id = reminder?.original_event_id;
      if (id == null) continue;

      if (!seenReminders.has(String(id))) remindersUnseen += 1;
    }

    return {
      inboxUnseen,
      remindersUnseen,
      total: inboxUnseen + remindersUnseen,
    };
  }, [visibleInbox, visibleReminders, reminderStorageTick]);

  const hideOneReminder = (eventId) => {
    const hidden = loadSet(HIDDEN_REMINDERS_KEY);

    hidden.add(String(eventId));
    saveSet(HIDDEN_REMINDERS_KEY, hidden);
    markOneReminderSeen(eventId);
    setReminderStorageTick((value) => value + 1);
  };

  const hideAllReminders = () => {
    const hidden = loadSet(HIDDEN_REMINDERS_KEY);
    const seen = loadSet(SEEN_REMINDERS_KEY);

    for (const reminder of reminders) {
      if (reminder?.original_event_id != null) {
        const id = String(reminder.original_event_id);
        hidden.add(id);
        seen.add(id);
      }
    }

    saveSet(HIDDEN_REMINDERS_KEY, hidden);
    saveSet(SEEN_REMINDERS_KEY, seen);
    setReminderStorageTick((value) => value + 1);
  };

  const markInboxLocallyRead = (notificationId) => {
    if (notificationId == null) return;

    const key = String(notificationId);

    setInbox((previous) =>
      previous.map((notification) => {
        if (String(notification.id) !== key) return notification;

        return {
          ...notification,
          isRead: true,
          raw: {
            ...notification.raw,
            is_read: true,
          },
        };
      }),
    );
  };

  const markInboxRead = async (notificationId) => {
    if (notificationId == null) return;

    markInboxLocallyRead(notificationId);

    try {
      await markNotificationRead(notificationId);
    } catch {
      await fetchAll();
    }
  };

  const hideOneInbox = async (notificationId) => {
    if (notificationId == null) return;

    const key = String(notificationId);

    setInbox((previous) =>
      previous.filter((notification) => String(notification.id) !== key),
    );

    if (selectedNotification?.id === notificationId) {
      setSelectedNotification(null);
    }

    try {
      await deleteNotification(notificationId);
    } catch {
      await fetchAll();
    }
  };

  const hideAllInbox = async () => {
    const ids = visibleInbox
      .map((notification) => notification?.id)
      .filter((id) => id != null);

    if (ids.length === 0) return;

    const idSet = new Set(ids.map((id) => String(id)));

    setInbox((previous) =>
      previous.filter((notification) => !idSet.has(String(notification.id))),
    );

    setSelectedNotification(null);

    const results = await Promise.allSettled(
      ids.map((id) => deleteNotification(id)),
    );

    const hasFailedDelete = results.some((result) => result.status === "rejected");

    if (hasFailedDelete) {
      await fetchAll();
    }
  };

  const clearCurrentTab = async () => {
    if (activeTab === "reminders") {
      hideAllReminders();
      return;
    }

    await hideAllInbox();
  };

  const clearEverything = async () => {
    hideAllReminders();
    await hideAllInbox();
  };

  const openReminder = (reminder) => {
    const link = `/app/events/${reminder.original_event_id}`;

    markOneReminderSeen(reminder.original_event_id);
    setOpen(false);
    navigate(link);
  };

  const openNotificationDetails = async (notification) => {
    markInboxLocallyRead(notification.id);
    setOpen(false);
    setSelectedNotification({
      ...notification,
      isRead: true,
    });

    await markInboxRead(notification.id);
  };

  const openInboxNotification = async (notification) => {
    markInboxLocallyRead(notification.id);
    setOpen(false);

    if (notification.link) {
      navigate(notification.link);
      await markInboxRead(notification.id);
      return;
    }

    setSelectedNotification({
      ...notification,
      isRead: true,
    });

    await markInboxRead(notification.id);
  };

  const openComposer = async () => {
    setOpen(false);
    setComposerOpen(true);

    setSendError("");
    setSendOk("");

    if (!isAdmin) return;
    if (users.length > 0) return;

    setUsersLoading(true);

    try {
      const list = await getUsers();
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const resetComposer = () => {
    setTitle("");
    setMessage("");
    setType("system");
    setTargetMode("all");
    setTargetRole("");
    setTargetUserId("");
    setSendError("");
    setSendOk("");
  };

  const closeComposer = () => {
    setComposerOpen(false);
    resetComposer();
  };

  const changeTargetMode = (value) => {
    setTargetMode(value);
    setTargetRole("");
    setTargetUserId("");
  };

  const canSendNow =
    title.trim().length > 0 && message.trim().length > 0 && !sending;

  const submit = async () => {
    setSendError("");
    setSendOk("");

    if (!canSendNow) return;

    setSending(true);

    try {
      if (targetMode === "user") {
        const userId = Number(targetUserId);

        if (Number.isNaN(userId)) {
          setSendError(t("notifications.errors.userRequired"));
          return;
        }

        await sendNotificationToUser({
          user_id: userId,
          title: title.trim(),
          message: message.trim(),
          type,
        });
      } else if (targetMode === "role") {
        if (!targetRole.trim()) {
          setSendError(t("notifications.errors.roleRequired"));
          return;
        }

        await broadcastNotification({
          title: title.trim(),
          message: message.trim(),
          type,
          target_type: "role",
          target_value: targetRole.trim(),
        });
      } else {
        await broadcastNotification({
          title: title.trim(),
          message: message.trim(),
          type,
          target_type: "all",
        });
      }

      setSendOk(t("notifications.sentOk"));
      await fetchAll();
      resetComposer();
    } catch (error) {
      const messageText =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        t("notifications.sendError");

      setSendError(String(messageText));
    } finally {
      setSending(false);
    }
  };

  const hasAnythingVisible =
    (activeTab === "reminders" && visibleReminders.length > 0) ||
    (activeTab === "inbox" && visibleInbox.length > 0);

  return {
    locale,
    isAdmin,

    rootRef,
    scrollRef,

    open,
    setOpen,
    activeTab,
    setActiveTab,

    loading,
    loadError,
    visibleReminders,
    visibleInbox,
    unseen,
    hasAnythingVisible,

    selectedNotification,
    setSelectedNotification,

    composerOpen,
    usersLoading,
    users,

    targetMode,
    targetRole,
    targetUserId,
    title,
    message,
    type,
    sending,
    sendError,
    sendOk,
    canSendNow,

    setTargetRole,
    setTargetUserId,
    setTitle,
    setMessage,
    setType,
    changeTargetMode,

    clearCurrentTab,
    clearEverything,
    hideOneReminder,
    hideOneInbox,
    openReminder,
    openInboxNotification,
    openNotificationDetails,
    openComposer,
    closeComposer,
    submit,
  };
}