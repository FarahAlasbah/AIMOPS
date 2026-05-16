import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { InfoMessage } from "../../../shared/components";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";

import EditUserDangerZone from "./edit-user/EditUserDangerZone";
import EditUserForm from "./edit-user/EditUserForm";
import EditUserModalHeader from "./edit-user/EditUserModalHeader";
import EditUserPasswordPanel from "./edit-user/EditUserPasswordPanel";

import {
  buildUserUpdatePayload,
  createRoleOptions,
  getInitialUserForm,
  getMergedFieldError,
  validateEditUserForm,
  validatePasswordForm,
} from "../utils/userFormUtils";

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

  const initial = useMemo(() => getInitialUserForm(user), [user]);

  const roleOptions = useMemo(
    () => createRoleOptions(initial.role_id, t),
    [initial.role_id, t],
  );

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

  const submit = async (event) => {
    event.preventDefault();

    const nextErrors = validateEditUserForm({
      form,
      isProtectedAdmin,
      t,
    });

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const payload = buildUserUpdatePayload({
      form,
      initial,
      isProtectedAdmin,
    });

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
    const nextErrors = validatePasswordForm({
      passwordActionsEnabled,
      currentPassword: pw.current,
      newPassword: pw.next,
      t,
    });

    setPwErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onChangePassword?.(user?.user_id, pw.current.trim(), pw.next.trim());

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
        <EditUserModalHeader
          user={user}
          t={t}
          busy={busy}
          pwBusy={pwBusy}
          onClose={closeSafely}
        />

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

          <EditUserForm
            t={t}
            form={form}
            roleOptions={roleOptions}
            isProtectedAdmin={isProtectedAdmin}
            busy={busy}
            saving={saving}
            emailError={emailError}
            fullNameError={fullNameError}
            roleError={roleError}
            onFieldChange={setField}
            onCancel={closeSafely}
          />

          <EditUserPasswordPanel
            t={t}
            enabled={passwordActionsEnabled}
            showPassword={showPassword}
            pw={pw}
            pwBusy={pwBusy}
            busy={busy}
            currentPasswordError={currentPasswordError}
            newPasswordError={newPasswordError}
            onTogglePassword={togglePassword}
            onPasswordChange={handlePasswordChange}
            onSubmitPassword={handleChangePassword}
          />

          <EditUserDangerZone
            t={t}
            deleting={deleting}
            disableDelete={disableDelete}
            busy={busy}
            onOpenDeleteConfirm={openDeleteConfirm}
          />
        </form>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t("editUser.confirmDelete.title", {
          defaultValue: "Delete user?",
        })}
        description={t("editUser.confirmDelete.description", {
          username: user?.username,
          defaultValue: `Are you sure you want to delete ${
            user?.username || "this user"
          }?`,
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