import { Button } from "../../../../shared/components";

function EditUserPasswordPanel({
  t,

  enabled,
  showPassword,
  pw,
  pwBusy,

  currentPasswordError,
  newPasswordError,

  onTogglePassword,
  onPasswordChange,
  onSubmitPassword,

  busy,
}) {
  if (!enabled) return null;

  return (
    <div className="danger-zone neutral-zone">
      <div className="zone-header">
        <div>
          <div className="danger-title neutral-title">
            {t("editUser.password.title", {
              defaultValue: "Change password",
            })}
          </div>

          <div className="danger-desc">
            {t("editUser.password.desc", {
              defaultValue:
                "Only administrators can update passwords for users.",
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={onTogglePassword}
          disabled={busy || pwBusy}
        >
          {showPassword
            ? t("editUser.password.cancelChange", {
                defaultValue: "Cancel password change",
              })
            : t("editUser.password.changePassword", {
                defaultValue: "Change password",
              })}
        </Button>
      </div>

      <div
        className={`password-panel ${showPassword ? "open" : ""}`}
        aria-hidden={!showPassword}
      >
        <div className="modal-grid">
          <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="edit-current-password">
              {t("editUser.password.current", {
                defaultValue: "Current password",
              })}
            </label>

            <input
              id="edit-current-password"
              name="current_password"
              type="password"
              className={`field-input ${currentPasswordError ? "error" : ""}`}
              value={pw.current}
              onChange={onPasswordChange("current")}
              disabled={pwBusy}
              autoComplete="current-password"
              aria-invalid={!!currentPasswordError}
            />

            {currentPasswordError && (
              <span className="field-error">{currentPasswordError}</span>
            )}
          </div>

          <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="edit-new-password">
              {t("editUser.password.new", {
                defaultValue: "New password",
              })}
            </label>

            <input
              id="edit-new-password"
              name="new_password"
              type="password"
              className={`field-input ${newPasswordError ? "error" : ""}`}
              value={pw.next}
              onChange={onPasswordChange("next")}
              disabled={pwBusy}
              autoComplete="new-password"
              aria-invalid={!!newPasswordError}
            />

            {newPasswordError && (
              <span className="field-error">{newPasswordError}</span>
            )}
          </div>
        </div>

        <div className="panel-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onSubmitPassword}
            disabled={pwBusy}
          >
            {pwBusy
              ? t("editUser.password.updating", {
                  defaultValue: "Updating...",
                })
              : t("editUser.password.update", {
                  defaultValue: "Update password",
                })}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EditUserPasswordPanel;