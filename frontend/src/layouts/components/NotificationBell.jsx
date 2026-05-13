// frontend/src/layouts/components/NotificationBell.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import FormSelect from "../../shared/components/FormSelect";
import { useAuth } from "../../shared/contexts/AuthContext";
import { getUsers } from "../../api/users";
import {
  broadcastNotification,
  getMyNotifications,
  getUpcomingReminders,
  sendNotificationToUser,
} from "../../api/notifications";
import { getForecastStatuses } from "../../api/forecasts";
import {
  getLocalForecastNotifications,
  syncForecastNotificationQueue,
} from "../../shared/utils/forecastNotifications";

import "./NotificationBell.css";

const SEEN_NOTIF_KEY = "aimops_seen_notifications_v1";
const SEEN_REMINDERS_KEY = "aimops_seen_reminders_v1";

const HIDDEN_NOTIF_KEY = "aimops_hidden_notifications_v1";
const HIDDEN_REMINDERS_KEY = "aimops_hidden_reminders_v1";

const safeJsonParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const loadSet = (key) => new Set(safeJsonParse(localStorage.getItem(key), []));

const saveSet = (key, set) => {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
};

const fmtDateTime = (iso, locale = undefined) => {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);

  return date.toLocaleString(locale);
};

const getForecastLink = (productId) => {
  if (!productId) return "/app/forecasting";
  return `/app/forecasting/${productId}`;
};

const normalizeNotif = (notification) => {
  const type = notification?.type ?? "";
  const relatedId =
    notification?.related_id ??
    notification?.entity_id ??
    notification?.entityId ??
    null;
  const relatedType = notification?.related_type ?? null;

  let link = null;

  switch (type) {
    case "event_detection":
      link = "/app/events";
      break;

    case "event_reminder":
      if (relatedId && relatedType === "event") {
        link = `/app/events/${relatedId}`;
      } else {
        link = "/app/events";
      }
      break;

    case "forecast_ready":
    case "forecast-ready":
    case "forecast":
    case "forecast-failed":
      link = getForecastLink(relatedId);
      break;

    case "campaign":
      if (relatedId) link = `/app/campaigns/${relatedId}`;
      break;

    case "product":
      if (relatedId) link = `/app/products/${relatedId}`;
      else link = "/app/products";
      break;

    default:
      if (notification?.title?.toLowerCase().includes("product")) {
        link = "/app/products";
      } else if (notification?.title?.toLowerCase().includes("event")) {
        link = "/app/events";
      } else if (notification?.title?.toLowerCase().includes("forecast")) {
        link = "/app/forecasting";
      } else {
        link = null;
      }
  }

  return {
    id:
      notification?.notification_id ??
      notification?.id ??
      notification?._id ??
      `${notification?.created_at || ""}:${notification?.title || ""}`,
    title: notification?.title ?? "",
    message: notification?.message ?? "",
    type,
    createdAt: notification?.created_at ?? notification?.createdAt ?? "",
    link,
    raw: notification,
  };
};

const normalizeLocalForecastNotification = (item, t) => {
  const isReady = String(item?.status || "").toLowerCase() === "ready";
  const productName =
    item?.product_name || t("notifications.forecastUnknownProduct");

  return {
    id: item?.id || `forecast:${item?.product_id || ""}`,
    title: isReady
      ? t("notifications.forecastReadyTitle")
      : t("notifications.forecastFailedTitle"),
    message: isReady
      ? t("notifications.forecastReadyBody", { name: productName })
      : t("notifications.forecastFailedBody", { name: productName }),
    type: isReady ? "forecast-ready" : "forecast-failed",
    createdAt: item?.created_at || item?.createdAt || "",
    link: getForecastLink(item?.product_id),
    raw: item,
  };
};

const dedupeById = (items) => {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const id = String(item?.id ?? "");
    if (!id || seen.has(id)) continue;

    seen.add(id);
    output.push(item);
  }

  return output;
};

export default function NotificationBell() {
  const { t, i18n } = useTranslation("common");
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const isAdmin =
    user?.role === "admin" ||
    user?.role_name === "admin" ||
    user?.role?.name === "admin" ||
    user?.role?.key === "admin" ||
    hasPermission?.("notifications.create");

  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const rootRef = useRef(null);
  const scrollRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reminders");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [reminders, setReminders] = useState([]);
  const [inbox, setInbox] = useState([]);

  const [hiddenTick, setHiddenTick] = useState(0);
  const [seenTick, setSeenTick] = useState(0);

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

  const roles = useMemo(() => {
    const set = new Set();

    for (const currentUser of users) {
      const role =
        currentUser?.role?.name || currentUser?.role_name || currentUser?.role;

      if (role) set.add(role);
    }

    return Array.from(set);
  }, [users]);

  const targetModeOptions = useMemo(
    () => [
      { value: "all", label: t("notifications.targetAll") },
      { value: "user", label: t("notifications.targetUser") },
      { value: "role", label: t("notifications.targetRole") },
    ],
    [t],
  );

  const typeOptions = useMemo(
    () => [
      { value: "system", label: t("notifications.types.system") },
      { value: "info", label: t("notifications.types.info") },
      { value: "warning", label: t("notifications.types.warning") },
    ],
    [t],
  );

  const userOptions = useMemo(
    () => [
      {
        value: "",
        label: usersLoading
          ? t("notifications.loading")
          : t("notifications.selectPlaceholder"),
        disabled: true,
      },
      ...users.map((currentUser) => ({
        value: String(currentUser.user_id ?? currentUser.id),
        label: `${currentUser.username || currentUser.email || t("notifications.unknownUser")}${
          currentUser.email ? ` (${currentUser.email})` : ""
        }`,
      })),
    ],
    [users, usersLoading, t],
  );

  const roleOptions = useMemo(
    () => [
      {
        value: "",
        label: usersLoading
          ? t("notifications.loading")
          : t("notifications.selectPlaceholder"),
        disabled: true,
      },
      ...roles.map((role) => ({
        value: role,
        label: role,
      })),
    ],
    [roles, usersLoading, t],
  );

  const fetchAll = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [remindersResponse, notificationsResponse, forecastResponse] =
        await Promise.all([
          getUpcomingReminders().catch(() => null),
          getMyNotifications().catch(() => []),
          getForecastStatuses().catch(() => null),
        ]);

      const reminderList = Array.isArray(remindersResponse?.reminders)
        ? remindersResponse.reminders
        : [];

      const notificationList = Array.isArray(notificationsResponse)
        ? notificationsResponse
        : [];

      const forecastModels = Array.isArray(forecastResponse?.models)
        ? forecastResponse.models
        : Array.isArray(forecastResponse?.products)
          ? forecastResponse.products
          : [];

      if (forecastModels.length > 0) {
        syncForecastNotificationQueue(forecastModels);
      }

      const localForecastInbox = getLocalForecastNotifications().map((item) =>
        normalizeLocalForecastNotification(item, t),
      );

      setReminders(reminderList);
      setInbox(
        dedupeById([
          ...localForecastInbox,
          ...notificationList.map(normalizeNotif),
        ]),
      );
    } catch {
      setLoadError(t("notifications.loadError"));
      setReminders([]);
      setInbox([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    const intervalId = window.setInterval(fetchAll, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [reminders, hiddenTick]);

  const visibleInbox = useMemo(() => {
    const hidden = loadSet(HIDDEN_NOTIF_KEY);

    return inbox.filter((notification) => {
      return !hidden.has(String(notification?.id));
    });
  }, [inbox, hiddenTick]);

  const markOneReminderSeen = (eventId) => {
    if (eventId == null) return;

    const seen = loadSet(SEEN_REMINDERS_KEY);
    const key = String(eventId);

    if (seen.has(key)) return;

    seen.add(key);
    saveSet(SEEN_REMINDERS_KEY, seen);
    setSeenTick((value) => value + 1);
  };

  const markOneInboxSeen = (notificationId) => {
    if (notificationId == null) return;

    const seen = loadSet(SEEN_NOTIF_KEY);
    const key = String(notificationId);

    if (seen.has(key)) return;

    seen.add(key);
    saveSet(SEEN_NOTIF_KEY, seen);
    setSeenTick((value) => value + 1);
  };

  useEffect(() => {
    if (!open) return;

    if (activeTab === "inbox") {
      const seenNotifications = loadSet(SEEN_NOTIF_KEY);
      let changed = false;

      for (const notification of visibleInbox) {
        if (notification?.id != null) {
          const id = String(notification.id);

          if (!seenNotifications.has(id)) {
            seenNotifications.add(id);
            changed = true;
          }
        }
      }

      if (changed) {
        saveSet(SEEN_NOTIF_KEY, seenNotifications);
        setSeenTick((value) => value + 1);
      }
    } else {
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
        setSeenTick((value) => value + 1);
      }
    }
  }, [open, activeTab, visibleInbox, visibleReminders]);

  const unseen = useMemo(() => {
    const seenNotifications = loadSet(SEEN_NOTIF_KEY);
    const seenReminders = loadSet(SEEN_REMINDERS_KEY);

    let inboxUnseen = 0;
    let remindersUnseen = 0;

    for (const notification of visibleInbox) {
      const id = notification?.id;
      if (id == null) continue;

      if (!seenNotifications.has(String(id))) inboxUnseen += 1;
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
  }, [visibleInbox, visibleReminders, seenTick]);

  const hideOneReminder = (eventId) => {
    const hidden = loadSet(HIDDEN_REMINDERS_KEY);

    hidden.add(String(eventId));
    saveSet(HIDDEN_REMINDERS_KEY, hidden);
    markOneReminderSeen(eventId);
    setHiddenTick((value) => value + 1);
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
    setHiddenTick((value) => value + 1);
    setSeenTick((value) => value + 1);
  };

  const hideOneInbox = (notificationId) => {
    const hidden = loadSet(HIDDEN_NOTIF_KEY);

    hidden.add(String(notificationId));
    saveSet(HIDDEN_NOTIF_KEY, hidden);
    markOneInboxSeen(notificationId);

    if (selectedNotification?.id === notificationId) {
      setSelectedNotification(null);
    }

    setHiddenTick((value) => value + 1);
  };

  const hideAllInbox = () => {
    const hidden = loadSet(HIDDEN_NOTIF_KEY);
    const seen = loadSet(SEEN_NOTIF_KEY);

    for (const notification of inbox) {
      if (notification?.id != null) {
        const id = String(notification.id);
        hidden.add(id);
        seen.add(id);
      }
    }

    saveSet(HIDDEN_NOTIF_KEY, hidden);
    saveSet(SEEN_NOTIF_KEY, seen);
    setSelectedNotification(null);
    setHiddenTick((value) => value + 1);
    setSeenTick((value) => value + 1);
  };

  const clearCurrentTab = () => {
    if (activeTab === "reminders") {
      hideAllReminders();
    } else {
      hideAllInbox();
    }
  };

  const clearEverything = () => {
    hideAllReminders();
    hideAllInbox();
  };

  const goToItem = (link, markSeen) => {
    markSeen?.();
    setOpen(false);

    if (link) {
      navigate(link);
    }
  };

  const openNotificationDetails = (notification) => {
    markOneInboxSeen(notification.id);
    setOpen(false);
    setSelectedNotification(notification);
  };

  const handleItemKeyDown = (event, action) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    action();
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

  const TabButton = ({ tab, label, count }) => (
    <button
      type="button"
      className={`notif-tab ${activeTab === tab ? "active" : ""}`}
      onClick={() => setActiveTab(tab)}
    >
      <span className="notif-tab-label">{label}</span>

      {count > 0 && (
        <span className="notif-tab-badge">{count > 99 ? "99+" : count}</span>
      )}
    </button>
  );

  const hasAnythingVisible =
    (activeTab === "reminders" && visibleReminders.length > 0) ||
    (activeTab === "inbox" && visibleInbox.length > 0);

  return (
    <div className="notif-root" ref={rootRef}>
      <button
        type="button"
        className="notif-btn"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("notifications.ariaOpen")}
      >
        <Bell size={18} />

        {unseen.total > 0 && (
          <span className="notif-badge">
            {unseen.total > 99 ? "99+" : unseen.total}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notif-popover"
          role="dialog"
          aria-label={t("notifications.title")}
        >
          <div className="notif-header">
            <div className="notif-title">{t("notifications.title")}</div>

            <div className="notif-header-actions">
              {isAdmin && (
                <button
                  type="button"
                  className="notif-linkbtn"
                  onClick={openComposer}
                >
                  {t("notifications.create")}
                </button>
              )}

              <button
                type="button"
                className="notif-iconbtn"
                onClick={() => setOpen(false)}
                aria-label={t("actions.close")}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notif-tabs">
            <TabButton
              tab="reminders"
              label={t("notifications.reminders")}
              count={unseen.remindersUnseen}
            />

            <TabButton
              tab="inbox"
              label={t("notifications.inbox")}
              count={unseen.inboxUnseen}
            />
          </div>

          <div className="notif-tools">
            <div className="notif-tools-left">
              {activeTab === "reminders"
                ? t("notifications.reminders")
                : t("notifications.inbox")}
            </div>

            <div className="notif-tools-right">
              <button
                type="button"
                className="notif-toolbtn"
                onClick={clearCurrentTab}
                disabled={!hasAnythingVisible}
                title={t("notifications.clearTabTitle")}
              >
                {t("notifications.clearTab")}
              </button>

              <button
                type="button"
                className="notif-toolbtn danger"
                onClick={clearEverything}
                disabled={
                  visibleReminders.length === 0 && visibleInbox.length === 0
                }
                title={t("notifications.clearAllTitle")}
              >
                {t("notifications.clearAll")}
              </button>
            </div>
          </div>

          <div className="notif-body" ref={scrollRef}>
            {loading ? (
              <div className="notif-loading">{t("notifications.loading")}</div>
            ) : loadError ? (
              <div className="notif-error">{loadError}</div>
            ) : activeTab === "reminders" ? (
              visibleReminders.length === 0 ? (
                <div className="notif-empty">
                  {t("notifications.noReminders")}
                </div>
              ) : (
                <div className="notif-list">
                  {visibleReminders.map((reminder) => {
                    const link = `/app/events/${reminder.original_event_id}`;

                    const openReminder = () => {
                      goToItem(link, () =>
                        markOneReminderSeen(reminder.original_event_id),
                      );
                    };

                    return (
                      <div
                        key={String(reminder.original_event_id)}
                        className="notif-item"
                        role="link"
                        tabIndex={0}
                        onClick={openReminder}
                        onKeyDown={(event) =>
                          handleItemKeyDown(event, openReminder)
                        }
                      >
                        <div className="notif-item-top">
                          <div className="notif-item-title">
                            {reminder.event_name}
                          </div>

                          <div className="notif-item-right">
                            <div className="notif-chip">
                              {t("notifications.daysUntil", {
                                n: reminder.days_until,
                              })}
                            </div>

                            <button
                              type="button"
                              className="notif-item-x"
                              aria-label={t("notifications.clearOne")}
                              title={t("notifications.clearOne")}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                hideOneReminder(reminder.original_event_id);
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="notif-item-body">
                          {reminder.message}
                        </div>

                        <div className="notif-item-meta">
                          <span className="meta-label">
                            {t("notifications.suggested")}
                          </span>{" "}
                          <span className="meta-val">
                            {reminder?.suggested_dates?.start} →{" "}
                            {reminder?.suggested_dates?.end}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : visibleInbox.length === 0 ? (
              <div className="notif-empty">{t("notifications.empty")}</div>
            ) : (
              <div className="notif-list">
                {visibleInbox.map((notification) => {
                  const link = notification.link;

                  const openNotification = () => {
                    if (link) {
                      goToItem(link, () => markOneInboxSeen(notification.id));
                      return;
                    }

                    openNotificationDetails(notification);
                  };

                  return (
                    <div
                      key={String(notification.id)}
                      className="notif-item"
                      role={link ? "link" : "button"}
                      tabIndex={0}
                      onClick={openNotification}
                      onKeyDown={(event) =>
                        handleItemKeyDown(event, openNotification)
                      }
                    >
                      <div className="notif-item-top">
                        <div className="notif-item-title">
                          {notification.title || t("notifications.untitled")}
                        </div>

                        <div className="notif-item-right">
                          <div className="notif-chip">
                            {String(notification.type || "info")}
                          </div>

                          <button
                            type="button"
                            className="notif-item-x"
                            aria-label={t("notifications.clearOne")}
                            title={t("notifications.clearOne")}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              hideOneInbox(notification.id);
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="notif-item-body">
                        {notification.message}
                      </div>

                      <div className="notif-item-meta">
                        {fmtDateTime(notification.createdAt, locale)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedNotification && (
        <div
          className="notif-detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={selectedNotification.title || t("notifications.untitled")}
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="notif-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notif-detail-header">
              <div>
                <div className="notif-detail-kicker">
                  {t("notifications.notificationDetails")}
                </div>

                <div className="notif-detail-title">
                  {selectedNotification.title || t("notifications.untitled")}
                </div>
              </div>

              <button
                type="button"
                className="notif-iconbtn"
                onClick={() => setSelectedNotification(null)}
                aria-label={t("actions.close")}
              >
                <X size={16} />
              </button>
            </div>

            <div className="notif-detail-body">
              <div className="notif-detail-chip-row">
                <span className="notif-chip">
                  {String(selectedNotification.type || "info")}
                </span>

                {selectedNotification.createdAt && (
                  <span className="notif-detail-date">
                    {fmtDateTime(selectedNotification.createdAt, locale)}
                  </span>
                )}
              </div>

              <p className="notif-detail-message">
                {selectedNotification.message || t("notifications.noMessage")}
              </p>
            </div>

            <div className="notif-detail-actions">
              <button
                type="button"
                className="notif-secondary"
                onClick={() => hideOneInbox(selectedNotification.id)}
              >
                {t("notifications.clearOne")}
              </button>

              <button
                type="button"
                className="notif-primary"
                onClick={() => setSelectedNotification(null)}
              >
                {t("actions.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {composerOpen && isAdmin && (
        <div
          className="notif-modal-overlay"
          role="dialog"
          aria-label={t("notifications.createDialog")}
        >
          <div className="notif-modal">
            <div className="notif-modal-header">
              <div className="notif-modal-title">
                {t("notifications.createTitle")}
              </div>

              <button
                type="button"
                className="notif-iconbtn"
                onClick={closeComposer}
                aria-label={t("actions.close")}
              >
                <X size={16} />
              </button>
            </div>

            <div className="notif-form">
              <FormSelect
                label={t("notifications.target")}
                value={targetMode}
                options={targetModeOptions}
                disabled={sending}
                onChange={(event) => {
                  setTargetMode(event.target.value);
                  setTargetRole("");
                  setTargetUserId("");
                }}
              />

              {targetMode === "user" && (
                <FormSelect
                  label={t("notifications.user")}
                  value={targetUserId}
                  options={userOptions}
                  disabled={sending || usersLoading}
                  onChange={(event) => setTargetUserId(event.target.value)}
                />
              )}

              {targetMode === "role" && (
                <div className="notif-row">
                  <FormSelect
                    label={t("notifications.role")}
                    value={targetRole}
                    options={roleOptions}
                    disabled={sending || usersLoading}
                    onChange={(event) => setTargetRole(event.target.value)}
                  />

                  <div className="notif-hint">
                    {t("notifications.roleHint")}
                  </div>
                </div>
              )}

              <div className="notif-row">
                <label className="notif-label">
                  {t("notifications.fields.title")}
                </label>

                <input
                  className="notif-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={sending}
                  placeholder={t("notifications.placeholders.title")}
                />
              </div>

              <div className="notif-row">
                <label className="notif-label">
                  {t("notifications.fields.message")}
                </label>

                <textarea
                  className="notif-textarea"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={sending}
                  placeholder={t("notifications.placeholders.message")}
                  rows={4}
                />
              </div>

              <FormSelect
                label={t("notifications.fields.type")}
                value={type}
                options={typeOptions}
                disabled={sending}
                onChange={(event) => setType(event.target.value)}
              />

              {sendError && <div className="notif-error">{sendError}</div>}
              {sendOk && <div className="notif-success">{sendOk}</div>}

              <div className="notif-actions">
                <button
                  type="button"
                  className="notif-secondary"
                  onClick={closeComposer}
                  disabled={sending}
                >
                  {t("actions.cancel")}
                </button>

                <button
                  type="button"
                  className="notif-primary"
                  onClick={submit}
                  disabled={!canSendNow}
                >
                  <Send size={16} />
                  {sending
                    ? t("notifications.sending")
                    : t("notifications.send")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}