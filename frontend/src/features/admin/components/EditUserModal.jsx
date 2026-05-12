import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, FormSelect, InfoMessage } from "../../../shared/components";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";

const ROLE_TO_ID = {
  "Marketing User": 2,
  "Business Owner": 3,
  Administrator: 1,
};

const fieldAliases = {
  email: ["email"],
  full_name: ["full_name", "fullName", "name"],
  role_id: ["role_id", "role", "roleId"],
  current_password: ["current_password", "currentPassword", "old_password"],
  new_password: ["new_password", "newPassword", "password"],
};

const getMergedFieldError = (field, localErrors, backendErrors) => {
  if (localErrors[field]) return localErrors[field];

  const aliases = fieldAliases[field] || [field];
  return aliases.map((key) => backendErrors?.[key]).find(Boolean) || "";
};

const EditUserModal = ({
  user,
  apiError,
  fieldErrors = {},
  onClearError,

  onClose,
  onSave,
  saving,

  onDelete,
  deleting,
  disableDelete,

  canChangePassword = false,
  onChangePassword,
  changingPassword,
}) => {
  const { t } = useTranslation("admin");

  const initial = useMemo(() => {
    const role_id = ROLE_TO_ID[user?.role_name] || 2;

    return {
      username: user?.username || "",
      email: user?.email || "",
      full_name: user?.full_name || "",
      role_id,
    };
  }, [user]);

  const roleOptions = useMemo(() => {
    const options = [];

    if (initial.role_id === 1) {
      options.push({
        value: "1",
        label: t("createUser.roles.admin", {
          defaultValue: "Administrator",
        }),
      });
    }

    options.push(
      {
        value: "2",
        label: t("createUser.roles.marketing", {
          defaultValue: "Marketing User",
        }),
      },
      {
        value: "3",
        label: t("createUser.roles.owner", {
          defaultValue: "Business Owner",
        }),
      },
    );

    return options;
  }, [initial.role_id, t]);

  const [form, setForm] = useState(initial);
  const [formErrors, setFormErrors] = useState({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    setForm(initial);
    setFormErrors({});
    setPw({ current: "", next: "" });
    setPwErrors({});
    setShowPassword(false);
  }, [initial]);

  const busy = !!(saving || deleting);
  const pwBusy = !!changingPassword;
  const isProtectedAdmin = initial.role_id === 1;
  const passwordActionsEnabled =
    canChangePassword && typeof onChangePassword === "function";

  const closeSafely = () => {
    if (busy || pwBusy) return;
    onClearError?.();
    onClose();
  };

  const clearFormFieldError = (field) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;

      const next = { ...prev };
      delete next[field];
      return next;
    });

    onClearError?.();
  };

  const clearPasswordFieldError = (field) => {
    setPwErrors((prev) => {
      if (!prev[field]) return prev;

      const next = { ...prev };
      delete next[field];
      return next;
    });

    onClearError?.();
  };

  const setField = (key) => (event) => {
    const value =
      key === "role_id" ? Number(event.target.value) : event.target.value;

    setForm((prev) => ({ ...prev, [key]: value }));
    clearFormFieldError(key);
  };

  const validateEditForm = () => {
    const nextErrors = {};
    const email = String(form.email || "").trim();
    const fullName = String(form.full_name || "").trim();
    const roleId = Number(form.role_id);

    if (!email) {
      nextErrors.email = t("editUser.errors.emailRequired", {
        defaultValue: "Email is required.",
      });
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = t("editUser.errors.emailInvalid", {
        defaultValue: "Enter a valid email address.",
      });
    }

    if (!fullName) {
      nextErrors.full_name = t("editUser.errors.fullNameRequired", {
        defaultValue: "Full name is required.",
      });
    }

    if (!isProtectedAdmin && ![2, 3].includes(roleId)) {
      nextErrors.role_id = t("editUser.errors.roleInvalid", {
        defaultValue: "Choose a valid role.",
      });
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!validateEditForm()) return;

    const email = String(form.email || "").trim();
    const fullName = String(form.full_name || "").trim();
    const roleId = Number(form.role_id);

    const payload = {};

    if (email !== initial.email) payload.email = email;
    if (fullName !== initial.full_name) payload.full_name = fullName;
    if (!isProtectedAdmin && roleId !== initial.role_id)
      payload.role_id = roleId;

    try {
      await onSave(payload);
    } catch {
      // The parent hook already stores and displays the API error.
    }
  };

  const openDeleteConfirm = () => {
    onClearError?.();
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setShowDeleteConfirm(false);
  };

  const doDelete = async () => {
    try {
      await onDelete?.(user);
      setShowDeleteConfirm(false);
    } catch {
      // Keep the confirm dialog open and show the API error in the modal.
    }
  };

  const togglePassword = () => {
    setPwErrors({});
    onClearError?.();
    setShowPassword((value) => !value);
  };

  const handlePasswordChange = (field) => (event) => {
    setPw((prev) => ({ ...prev, [field]: event.target.value }));

    clearPasswordFieldError(
      field === "current" ? "current_password" : "new_password",
    );
  };

  const handleChangePassword = async () => {
    const nextErrors = {};

    if (!passwordActionsEnabled) {
      nextErrors.new_password = t("editUser.password.errors.adminOnly", {
        defaultValue: "Only administrators can change user passwords.",
      });
      setPwErrors(nextErrors);
      return;
    }

    const current = String(pw.current || "").trim();
    const next = String(pw.next || "").trim();

    if (!current) {
      nextErrors.current_password = t(
        "editUser.password.errors.currentRequired",
        {
          defaultValue: "Current password is required.",
        },
      );
    }

    if (!next) {
      nextErrors.new_password = t("editUser.password.errors.newRequired", {
        defaultValue: "New password is required.",
      });
    } else if (next.length < 8) {
      nextErrors.new_password = t("editUser.password.errors.newMin", {
        defaultValue: "New password must be at least 8 characters.",
      });
    }

    setPwErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onChangePassword?.(user?.user_id, current, next);

      setPw({ current: "", next: "" });
      setPwErrors({});
      setShowPassword(false);
    } catch {
      // The parent hook already stores and displays the API error.
    }
  };

  const emailError = getMergedFieldError("email", formErrors, fieldErrors);
  const fullNameError = getMergedFieldError(
    "full_name",
    formErrors,
    fieldErrors,
  );
  const roleError = getMergedFieldError("role_id", formErrors, fieldErrors);
  const currentPasswordError = getMergedFieldError(
    "current_password",
    pwErrors,
    fieldErrors,
  );
  const newPasswordError = getMergedFieldError(
    "new_password",
    pwErrors,
    fieldErrors,
  );

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={closeSafely}
    >
      <div
        className="modal-card modal-card-scroll"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {t("editUser.title", {
                defaultValue: "Edit user",
              })}
            </div>
            <div className="modal-subtitle">{user?.username}</div>
          </div>

          <button
            type="button"
            className="modal-x"
            onClick={closeSafely}
            aria-label={t("common.close", {
              defaultValue: "Close",
            })}
            disabled={busy || pwBusy}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={submit}
          className="modal-body modal-body-scroll"
          noValidate
        >
          {apiError && (
            <div className="api-error-inline" aria-live="polite">
              <InfoMessage type="error">{apiError}</InfoMessage>
            </div>
          )}

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
                onChange={setField("email")}
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
                onChange={setField("full_name")}
                disabled={busy}
                autoComplete="name"
                aria-invalid={!!fullNameError}
                aria-describedby={
                  fullNameError ? "edit-fullname-error" : undefined
                }
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
                onChange={setField("role_id")}
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
            <Button
              type="button"
              variant="secondary"
              onClick={closeSafely}
              disabled={busy}
            >
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

          {passwordActionsEnabled && (
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
                  onClick={togglePassword}
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
                      className={`field-input ${
                        currentPasswordError ? "error" : ""
                      }`}
                      value={pw.current}
                      onChange={handlePasswordChange("current")}
                      disabled={pwBusy}
                      autoComplete="current-password"
                      aria-invalid={!!currentPasswordError}
                    />

                    {currentPasswordError && (
                      <span className="field-error">
                        {currentPasswordError}
                      </span>
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
                      onChange={handlePasswordChange("next")}
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
                    onClick={handleChangePassword}
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
          )}

          <div className="danger-zone">
            <div className="danger-title">
              {t("editUser.danger.title", {
                defaultValue: "Danger zone",
              })}
            </div>

            <div className="danger-desc">
              {t("editUser.danger.desc", {
                defaultValue:
                  "Deleting this user will deactivate their account.",
              })}
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={openDeleteConfirm}
              disabled={disableDelete || busy}
            >
              {deleting
                ? t("editUser.danger.deleting", {
                    defaultValue: "Deleting...",
                  })
                : t("editUser.danger.delete", {
                    defaultValue: "Delete user",
                  })}
            </Button>

            {disableDelete && (
              <div className="danger-hint">
                {t("editUser.danger.cannotDeleteHint", {
                  defaultValue:
                    "You cannot delete yourself or a protected administrator account.",
                })}
              </div>
            )}
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t("editUser.confirmDelete.title", {
          defaultValue: "Delete user?",
        })}
        description={t("editUser.confirmDelete.description", {
          username: user?.username,
          defaultValue: `Are you sure you want to delete ${user?.username || "this user"}?`,
        })}
        confirmText={t("editUser.confirmDelete.confirm", {
          defaultValue: "Delete",
        })}
        cancelText={t("editUser.confirmDelete.cancel", {
          defaultValue: "Cancel",
        })}
        loading={deleting}
        disabled={disableDelete}
        onCancel={closeDeleteConfirm}
        onConfirm={doDelete}
      />
    </div>
  );
};

export default EditUserModal;
