import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fmtDateTime } from "./notificationBellUtils";

function handleItemKeyDown(event, action) {
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  action();
}

function TabButton({ activeTab, tab, label, count, onChange }) {
  return (
    <button
      type="button"
      className={`notif-tab ${activeTab === tab ? "active" : ""}`}
      onClick={() => onChange(tab)}
    >
      <span className="notif-tab-label">{label}</span>

      {count > 0 && (
        <span className="notif-tab-badge">{count > 99 ? "99+" : count}</span>
      )}
    </button>
  );
}

export default function NotificationPopover({
  locale,
  isAdmin,
  activeTab,
  setActiveTab,
  loading,
  loadError,
  visibleReminders,
  visibleInbox,
  unseen,
  hasAnythingVisible,
  scrollRef,
  onClose,
  onOpenComposer,
  onClearCurrentTab,
  onClearEverything,
  onHideReminder,
  onHideInbox,
  onOpenReminder,
  onOpenInboxNotification,
}) {
  const { t } = useTranslation("common");

  return (
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
              onClick={onOpenComposer}
            >
              {t("notifications.create")}
            </button>
          )}

          <button
            type="button"
            className="notif-iconbtn"
            onClick={onClose}
            aria-label={t("actions.close")}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="notif-tabs">
        <TabButton
          activeTab={activeTab}
          tab="reminders"
          label={t("notifications.reminders")}
          count={unseen.remindersUnseen}
          onChange={setActiveTab}
        />

        <TabButton
          activeTab={activeTab}
          tab="inbox"
          label={t("notifications.inbox")}
          count={unseen.inboxUnseen}
          onChange={setActiveTab}
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
            onClick={onClearCurrentTab}
            disabled={!hasAnythingVisible}
            title={t("notifications.clearTabTitle")}
          >
            {t("notifications.clearTab")}
          </button>

          <button
            type="button"
            className="notif-toolbtn danger"
            onClick={onClearEverything}
            disabled={visibleReminders.length === 0 && visibleInbox.length === 0}
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
            <div className="notif-empty">{t("notifications.noReminders")}</div>
          ) : (
            <div className="notif-list">
              {visibleReminders.map((reminder) => {
                const openReminder = () => onOpenReminder(reminder);

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
                            onHideReminder(reminder.original_event_id);
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="notif-item-body">{reminder.message}</div>

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
              const openNotification = () => onOpenInboxNotification(notification);

              return (
                <div
                  key={String(notification.id)}
                  className="notif-item"
                  role={notification.link ? "link" : "button"}
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
                          onHideInbox(notification.id);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="notif-item-body">{notification.message}</div>

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
  );
}