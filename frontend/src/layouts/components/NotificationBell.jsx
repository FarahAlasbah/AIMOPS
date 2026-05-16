import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

import NotificationComposerModal from "./notifications/NotificationComposerModal";
import NotificationDetailsModal from "./notifications/NotificationDetailsModal";
import NotificationPopover from "./notifications/NotificationPopover";
import { useNotificationBell } from "./notifications/useNotificationBell";

import "./NotificationBell.css";

export default function NotificationBell() {
  const { t } = useTranslation("common");
  const notification = useNotificationBell();

  return (
    <div className="notif-root" ref={notification.rootRef}>
      <button
        type="button"
        className="notif-btn"
        onClick={() => notification.setOpen((value) => !value)}
        aria-label={t("notifications.ariaOpen")}
      >
        <Bell size={18} />

        {notification.unseen.total > 0 && (
          <span className="notif-badge">
            {notification.unseen.total > 99 ? "99+" : notification.unseen.total}
          </span>
        )}
      </button>

      {notification.open && (
        <NotificationPopover
          locale={notification.locale}
          isAdmin={notification.isAdmin}
          activeTab={notification.activeTab}
          setActiveTab={notification.setActiveTab}
          loading={notification.loading}
          loadError={notification.loadError}
          visibleReminders={notification.visibleReminders}
          visibleInbox={notification.visibleInbox}
          unseen={notification.unseen}
          hasAnythingVisible={notification.hasAnythingVisible}
          scrollRef={notification.scrollRef}
          onClose={() => notification.setOpen(false)}
          onOpenComposer={notification.openComposer}
          onClearCurrentTab={notification.clearCurrentTab}
          onClearEverything={notification.clearEverything}
          onHideReminder={notification.hideOneReminder}
          onHideInbox={notification.hideOneInbox}
          onOpenReminder={notification.openReminder}
          onOpenInboxNotification={notification.openInboxNotification}
        />
      )}

      <NotificationDetailsModal
        notification={notification.selectedNotification}
        locale={notification.locale}
        onClose={() => notification.setSelectedNotification(null)}
        onHide={notification.hideOneInbox}
      />

      <NotificationComposerModal
        open={notification.composerOpen}
        isAdmin={notification.isAdmin}
        usersLoading={notification.usersLoading}
        users={notification.users}
        targetMode={notification.targetMode}
        targetRole={notification.targetRole}
        targetUserId={notification.targetUserId}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        sending={notification.sending}
        sendError={notification.sendError}
        sendOk={notification.sendOk}
        canSendNow={notification.canSendNow}
        onClose={notification.closeComposer}
        onSubmit={notification.submit}
        onChangeTargetMode={notification.changeTargetMode}
        onChangeTargetRole={notification.setTargetRole}
        onChangeTargetUserId={notification.setTargetUserId}
        onChangeTitle={notification.setTitle}
        onChangeMessage={notification.setMessage}
        onChangeType={notification.setType}
      />
    </div>
  );
}