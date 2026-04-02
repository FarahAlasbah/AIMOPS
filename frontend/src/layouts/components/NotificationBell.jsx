import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, X, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./NotificationBell.css";

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

const SEEN_NOTIF_KEY = "aimops_seen_notifications_v1";
const SEEN_REMINDERS_KEY = "aimops_seen_reminders_v1";

const HIDDEN_NOTIF_KEY = "aimops_hidden_notifications_v1";
const HIDDEN_REMINDERS_KEY = "aimops_hidden_reminders_v1";

const safeJsonParse = (v, fallback) => {
  try {
    const x = JSON.parse(v);
    return x ?? fallback;
  } catch {
    return fallback;
  }
};

const loadSet = (key) => new Set(safeJsonParse(localStorage.getItem(key), []));
const saveSet = (key, set) => localStorage.setItem(key, JSON.stringify(Array.from(set)));

const fmtDateTime = (iso, locale = undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(locale);
};

const normalizeNotif = (n) => {
  return {
    id:
      n?.notification_id ??
      n?.id ??
      n?._id ??
      `${n?.created_at || ""}:${n?.title || ""}`,
    title: n?.title ?? "",
    message: n?.message ?? "",
    type: n?.type ?? "info",
    createdAt: n?.created_at ?? n?.createdAt ?? "",
  };
};

const normalizeLocalForecastNotification = (item, t) => {
  const isReady = String(item?.status || "").toLowerCase() === "ready";
  const productName = item?.product_name || t("notifications.forecastUnknownProduct");

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
  };
};

const dedupeById = (items) => {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const id = String(item?.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }

  return out;
};

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const { user, hasPermission } = useAuth();

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
    for (const u of users) {
      const r = u?.role?.name || u?.role_name || u?.role;
      if (r) set.add(r);
    }
    return Array.from(set);
  }, [users]);

  const fetchAll = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [remRes, notifRes, forecastRes] = await Promise.all([
        getUpcomingReminders().catch(() => null),
        getMyNotifications().catch(() => []),
        getForecastStatuses().catch(() => null),
      ]);

      const remList = Array.isArray(remRes?.reminders) ? remRes.reminders : [];
      const notifList = Array.isArray(notifRes) ? notifRes : [];

      if (Array.isArray(forecastRes?.models)) {
        syncForecastNotificationQueue(forecastRes.models);
      }

      const localForecastInbox = getLocalForecastNotifications().map((item) =>
        normalizeLocalForecastNotification(item, t)
      );

      setReminders(remList);
      setInbox(dedupeById([...localForecastInbox, ...notifList.map(normalizeNotif)]));
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
    const id = window.setInterval(fetchAll, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [activeTab, open]);

  const visibleReminders = useMemo(() => {
    const hidden = loadSet(HIDDEN_REMINDERS_KEY);
    return reminders.filter((r) => !hidden.has(String(r?.original_event_id)));
  }, [reminders, hiddenTick]);

  const visibleInbox = useMemo(() => {
    const hidden = loadSet(HIDDEN_NOTIF_KEY);
    return inbox.filter((n) => !hidden.has(String(n?.id)));
  }, [inbox, hiddenTick]);

  useEffect(() => {
    if (!open) return;

    if (activeTab === "inbox") {
      const seenNotifs = loadSet(SEEN_NOTIF_KEY);
      for (const n of visibleInbox) {
        if (n?.id != null) seenNotifs.add(String(n.id));
      }
      saveSet(SEEN_NOTIF_KEY, seenNotifs);
    } else {
      const seenRems = loadSet(SEEN_REMINDERS_KEY);
      for (const r of visibleReminders) {
        if (r?.original_event_id != null) seenRems.add(String(r.original_event_id));
      }
      saveSet(SEEN_REMINDERS_KEY, seenRems);
    }
  }, [open, activeTab, visibleInbox, visibleReminders]);

  const unseen = useMemo(() => {
    const seenNotifs = loadSet(SEEN_NOTIF_KEY);
    const seenRems = loadSet(SEEN_REMINDERS_KEY);

    let inboxUnseen = 0;
    for (const x of visibleInbox) {
      const id = x?.id;
      if (id == null) continue;
      if (!seenNotifs.has(String(id))) inboxUnseen += 1;
    }

    let remindersUnseen = 0;
    for (const r of visibleReminders) {
      const id = r?.original_event_id;
      if (id == null) continue;
      if (!seenRems.has(String(id))) remindersUnseen += 1;
    }

    return {
      inboxUnseen,
      remindersUnseen,
      total: inboxUnseen + remindersUnseen,
    };
  }, [visibleInbox, visibleReminders]);

  const hideOneReminder = (eventId) => {
    const hidden = loadSet(HIDDEN_REMINDERS_KEY);
    hidden.add(String(eventId));
    saveSet(HIDDEN_REMINDERS_KEY, hidden);
    setHiddenTick((x) => x + 1);
  };

  const hideAllReminders = () => {
    const hidden = loadSet(HIDDEN_REMINDERS_KEY);
    for (const r of reminders) {
      if (r?.original_event_id != null) hidden.add(String(r.original_event_id));
    }
    saveSet(HIDDEN_REMINDERS_KEY, hidden);
    setHiddenTick((x) => x + 1);
  };

  const hideOneInbox = (notifId) => {
    const hidden = loadSet(HIDDEN_NOTIF_KEY);
    hidden.add(String(notifId));
    saveSet(HIDDEN_NOTIF_KEY, hidden);
    setHiddenTick((x) => x + 1);
  };

  const hideAllInbox = () => {
    const hidden = loadSet(HIDDEN_NOTIF_KEY);
    for (const n of inbox) {
      if (n?.id != null) hidden.add(String(n.id));
    }
    saveSet(HIDDEN_NOTIF_KEY, hidden);
    setHiddenTick((x) => x + 1);
  };

  const clearCurrentTab = () => {
    if (activeTab === "reminders") hideAllReminders();
    else hideAllInbox();
  };

  const clearEverything = () => {
    hideAllReminders();
    hideAllInbox();
  };

  const openComposer = async () => {
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

  const canSendNow = title.trim().length > 0 && message.trim().length > 0 && !sending;

  const submit = async () => {
    setSendError("");
    setSendOk("");

    if (!canSendNow) return;

    setSending(true);
    try {
      if (targetMode === "user") {
        const uid = Number(targetUserId);
        if (Number.isNaN(uid)) {
          setSendError(t("notifications.errors.userRequired"));
          return;
        }
        await sendNotificationToUser({ user_id: uid, title: title.trim(), message: message.trim(), type });
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
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        t("notifications.sendError");
      setSendError(String(msg));
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
      {count > 0 && <span className="notif-tab-badge">{count > 99 ? "99+" : count}</span>}
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
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notifications.ariaOpen")}
      >
        <Bell size={18} />
        {unseen.total > 0 && <span className="notif-badge">{unseen.total > 99 ? "99+" : unseen.total}</span>}
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
                <button type="button" className="notif-linkbtn" onClick={openComposer}>
                  {t("notifications.create")}
                </button>
              )}
              <button type="button" className="notif-iconbtn" onClick={() => setOpen(false)} aria-label="Close">
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
                title={t("notifications.clearTabTitle", { defaultValue: "Clear this tab" })}
              >
                {t("notifications.clearTab", { defaultValue: "Clear" })}
              </button>

              <button
                type="button"
                className="notif-toolbtn danger"
                onClick={clearEverything}
                disabled={visibleReminders.length === 0 && visibleInbox.length === 0}
                title={t("notifications.clearAllTitle", { defaultValue: "Clear everything" })}
              >
                {t("notifications.clearAll", { defaultValue: "Clear all" })}
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
                <div className="notif-empty">{t("notifications.noReminders")}</div>
              ) : (
                <div className="notif-list">
                  {visibleReminders.map((r) => (
                    <Link
                      key={String(r.original_event_id)}
                      className="notif-item"
                      to={`/app/events/${r.original_event_id}`}
                      onClick={() => setOpen(false)}
                    >
                      <div className="notif-item-top">
                        <div className="notif-item-title">{r.event_name}</div>

                        <div className="notif-item-right">
                          <div className="notif-chip">
                            {t("notifications.daysUntil", { n: r.days_until })}
                          </div>

                          <button
                            type="button"
                            className="notif-item-x"
                            aria-label={t("notifications.clearOne", { defaultValue: "Clear item" })}
                            title={t("notifications.clearOne", { defaultValue: "Clear item" })}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              hideOneReminder(r.original_event_id);
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="notif-item-body">{r.message}</div>

                      <div className="notif-item-meta">
                        <span className="meta-label">{t("notifications.suggested")}</span>{" "}
                        <span className="meta-val">
                          {r?.suggested_dates?.start} → {r?.suggested_dates?.end}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : visibleInbox.length === 0 ? (
              <div className="notif-empty">{t("notifications.empty")}</div>
            ) : (
              <div className="notif-list">
                {visibleInbox.map((n) => (
                  <div key={String(n.id)} className="notif-item static">
                    <div className="notif-item-top">
                      <div className="notif-item-title">
                        {n.title || t("notifications.untitled")}
                      </div>

                      <div className="notif-item-right">
                        <div className="notif-chip">{String(n.type || "info")}</div>

                        <button
                          type="button"
                          className="notif-item-x"
                          aria-label={t("notifications.clearOne", { defaultValue: "Clear item" })}
                          title={t("notifications.clearOne", { defaultValue: "Clear item" })}
                          onClick={() => hideOneInbox(n.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="notif-item-body">{n.message}</div>
                    <div className="notif-item-meta">{fmtDateTime(n.createdAt, locale)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {composerOpen && isAdmin && (
        <div className="notif-modal-overlay" role="dialog" aria-label="Create notification">
          <div className="notif-modal">
            <div className="notif-modal-header">
              <div className="notif-modal-title">{t("notifications.createTitle")}</div>
              <button type="button" className="notif-iconbtn" onClick={closeComposer} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="notif-form">
              <div className="notif-row">
                <label className="notif-label">{t("notifications.target")}</label>
                <select
                  className="notif-select"
                  value={targetMode}
                  onChange={(e) => setTargetMode(e.target.value)}
                  disabled={sending}
                >
                  <option value="all">{t("notifications.targetAll")}</option>
                  <option value="user">{t("notifications.targetUser")}</option>
                  <option value="role">{t("notifications.targetRole")}</option>
                </select>
              </div>

              {targetMode === "user" && (
                <div className="notif-row">
                  <label className="notif-label">{t("notifications.user")}</label>
                  <select
                    className="notif-select"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    disabled={sending || usersLoading}
                  >
                    <option value="">{usersLoading ? t("notifications.loading") : "—"}</option>
                    {users.map((u) => (
                      <option key={u.user_id ?? u.id} value={String(u.user_id ?? u.id)}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetMode === "role" && (
                <div className="notif-row">
                  <label className="notif-label">{t("notifications.role")}</label>
                  <select
                    className="notif-select"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    disabled={sending || usersLoading}
                  >
                    <option value="">{usersLoading ? t("notifications.loading") : "—"}</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <div className="notif-hint">{t("notifications.roleHint")}</div>
                </div>
              )}

              <div className="notif-row">
                <label className="notif-label">{t("notifications.fields.title")}</label>
                <input
                  className="notif-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={sending}
                  placeholder={t("notifications.placeholders.title")}
                />
              </div>

              <div className="notif-row">
                <label className="notif-label">{t("notifications.fields.message")}</label>
                <textarea
                  className="notif-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={sending}
                  placeholder={t("notifications.placeholders.message")}
                  rows={4}
                />
              </div>

              <div className="notif-row">
                <label className="notif-label">{t("notifications.fields.type")}</label>
                <select className="notif-select" value={type} onChange={(e) => setType(e.target.value)} disabled={sending}>
                  <option value="system">{t("notifications.types.system")}</option>
                  <option value="info">{t("notifications.types.info")}</option>
                  <option value="warning">{t("notifications.types.warning")}</option>
                </select>
              </div>

              {sendError && <div className="notif-error">{sendError}</div>}
              {sendOk && <div className="notif-success">{sendOk}</div>}

              <div className="notif-actions">
                <button type="button" className="notif-secondary" onClick={closeComposer} disabled={sending}>
                  {t("actions.cancel")}
                </button>

                <button type="button" className="notif-primary" onClick={submit} disabled={!canSendNow}>
                  <Send size={16} />
                  {sending ? t("notifications.sending") : t("notifications.send")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}