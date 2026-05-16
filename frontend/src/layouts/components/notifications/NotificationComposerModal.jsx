import { useMemo } from "react";
import { Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import FormSelect from "../../../shared/components/FormSelect";

export default function NotificationComposerModal({
  open,
  isAdmin,
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
  onClose,
  onSubmit,
  onChangeTargetMode,
  onChangeTargetRole,
  onChangeTargetUserId,
  onChangeTitle,
  onChangeMessage,
  onChangeType,
}) {
  const { t } = useTranslation("common");

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

  if (!open || !isAdmin) return null;

  return (
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
            onClick={onClose}
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
            onChange={(event) => onChangeTargetMode(event.target.value)}
          />

          {targetMode === "user" && (
            <FormSelect
              label={t("notifications.user")}
              value={targetUserId}
              options={userOptions}
              disabled={sending || usersLoading}
              onChange={(event) => onChangeTargetUserId(event.target.value)}
            />
          )}

          {targetMode === "role" && (
            <div className="notif-row">
              <FormSelect
                label={t("notifications.role")}
                value={targetRole}
                options={roleOptions}
                disabled={sending || usersLoading}
                onChange={(event) => onChangeTargetRole(event.target.value)}
              />

              <div className="notif-hint">{t("notifications.roleHint")}</div>
            </div>
          )}

          <div className="notif-row">
            <label className="notif-label">
              {t("notifications.fields.title")}
            </label>

            <input
              className="notif-input"
              value={title}
              onChange={(event) => onChangeTitle(event.target.value)}
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
              onChange={(event) => onChangeMessage(event.target.value)}
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
            onChange={(event) => onChangeType(event.target.value)}
          />

          {sendError && <div className="notif-error">{sendError}</div>}
          {sendOk && <div className="notif-success">{sendOk}</div>}

          <div className="notif-actions">
            <button
              type="button"
              className="notif-secondary"
              onClick={onClose}
              disabled={sending}
            >
              {t("actions.cancel")}
            </button>

            <button
              type="button"
              className="notif-primary"
              onClick={onSubmit}
              disabled={!canSendNow}
            >
              <Send size={16} />
              {sending ? t("notifications.sending") : t("notifications.send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}