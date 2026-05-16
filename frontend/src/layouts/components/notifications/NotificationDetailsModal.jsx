import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fmtDateTime } from "./notificationBellUtils";

export default function NotificationDetailsModal({
  notification,
  locale,
  onClose,
  onHide,
}) {
  const { t } = useTranslation("common");

  if (!notification) return null;

  return (
    <div
      className="notif-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={notification.title || t("notifications.untitled")}
      onClick={onClose}
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
              {notification.title || t("notifications.untitled")}
            </div>
          </div>

          <button
            type="button"
            className="notif-iconbtn"
            onClick={onClose}
            aria-label={t("actions.close")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="notif-detail-body">
          <div className="notif-detail-chip-row">
            <span className="notif-chip">
              {String(notification.type || "info")}
            </span>

            {notification.createdAt && (
              <span className="notif-detail-date">
                {fmtDateTime(notification.createdAt, locale)}
              </span>
            )}
          </div>

          <p className="notif-detail-message">
            {notification.message || t("notifications.noMessage")}
          </p>
        </div>

        <div className="notif-detail-actions">
          <button
            type="button"
            className="notif-secondary"
            onClick={() => onHide(notification.id)}
          >
            {t("notifications.clearOne")}
          </button>

          <button type="button" className="notif-primary" onClick={onClose}>
            {t("actions.close")}
          </button>
        </div>
      </div>
    </div>
  );
}