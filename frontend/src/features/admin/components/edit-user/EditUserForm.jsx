import { Button, FormSelect } from "../../../../shared/components";

function EditUserForm({
  t,

  form,
  roleOptions,
  isProtectedAdmin,
  busy,
  saving,

  emailError,
  fullNameError,
  roleError,

  onFieldChange,
  onCancel,
}) {
  return (
    <>
      <div className="modal-grid">
        <div className="modal-field">
          <label htmlFor="edit-username">
            {t("editUser.labels.username", {
              defaultValue: "Username",
            })}
          </label>

          <div
            className="locked-field"
            title={t("editUser.usernameCantChange", {
              defaultValue: "Username cannot be changed.",
            })}
          >
            <input
              id="edit-username"
              name="username"
              className="field-input"
              value={form.username}
              readOnly
              disabled
              autoComplete="username"
            />

            <span className="locked-tooltip" role="tooltip">
              {t("editUser.usernameCantChangeTooltip", {
                defaultValue: "Username cannot be changed.",
              })}
            </span>
          </div>
        </div>

        <div className="modal-field">
          <label htmlFor="edit-email">
            {t("editUser.labels.email", {
              defaultValue: "Email",
            })}
          </label>

          <input
            id="edit-email"
            name="email"
            type="email"
            className={`field-input ${emailError ? "error" : ""}`}
            value={form.email}
            onChange={onFieldChange("email")}
            disabled={busy}
            autoComplete="email"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "edit-email-error" : undefined}
          />

          {emailError && (
            <span id="edit-email-error" className="field-error">
              {emailError}
            </span>
          )}
        </div>

        <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="edit-fullname">
            {t("editUser.labels.fullName", {
              defaultValue: "Full name",
            })}
          </label>

          <input
            id="edit-fullname"
            name="full_name"
            className={`field-input ${fullNameError ? "error" : ""}`}
            value={form.full_name}
            onChange={onFieldChange("full_name")}
            disabled={busy}
            autoComplete="name"
            aria-invalid={!!fullNameError}
            aria-describedby={fullNameError ? "edit-fullname-error" : undefined}
          />

          {fullNameError && (
            <span id="edit-fullname-error" className="field-error">
              {fullNameError}
            </span>
          )}
        </div>

        <div
          className="modal-field admin-form-select-wrap"
          style={{ gridColumn: "1 / -1" }}
        >
          <FormSelect
            label={t("editUser.labels.role", {
              defaultValue: "Role",
            })}
            value={String(form.role_id)}
            onChange={onFieldChange("role_id")}
            options={roleOptions}
            disabled={busy || isProtectedAdmin}
          />

          {isProtectedAdmin && (
            <span className="field-hint">
              {t("editUser.adminRoleLocked", {
                defaultValue: "Administrator role is protected.",
              })}
            </span>
          )}

          {roleError && <span className="field-error">{roleError}</span>}
        </div>
      </div>

      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          {t("editUser.buttons.cancel", {
            defaultValue: "Cancel",
          })}
        </Button>

        <Button type="submit" disabled={busy}>
          {saving
            ? t("editUser.buttons.saving", {
                defaultValue: "Saving...",
              })
            : t("editUser.buttons.saveChanges", {
                defaultValue: "Save changes",
              })}
        </Button>
      </div>
    </>
  );
}

export default EditUserForm;