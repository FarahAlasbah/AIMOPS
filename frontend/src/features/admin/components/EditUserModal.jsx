// frontend/src/features/admin/components/EditUserModal.jsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../shared/components";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import { useTranslation } from "react-i18next";

const ROLE_TO_ID = {
  "Marketing User": 2,
  "Business Owner": 3,
  Administrator: 1,
};

const EditUserModal = ({
  user,
  onClose,
  onSave,
  saving,

  onDelete,
  deleting,
  disableDelete,

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

  const roleOptions = [
    { value: 2, label: t("createUser.roles.marketing") },
    { value: 3, label: t("createUser.roles.owner") },
  ];

  const [form, setForm] = useState(initial);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwError, setPwError] = useState("");

  useEffect(() => setForm(initial), [initial]);

  const busy = !!(saving || deleting);
  const pwBusy = !!changingPassword;

  const setField = (k) => (e) => {
    const v = k === "role_id" ? Number(e.target.value) : e.target.value;
    setForm((p) => ({ ...p, [k]: v }));
  };

  const submit = (e) => {
    e.preventDefault();

    const payload = {};
    if (form.email !== initial.email) payload.email = form.email;
    if (form.full_name !== initial.full_name) payload.full_name = form.full_name;
    if (form.role_id !== initial.role_id) payload.role_id = form.role_id;

    onSave(payload);
  };

  const openDeleteConfirm = () => setShowDeleteConfirm(true);
  const closeDeleteConfirm = () => setShowDeleteConfirm(false);

  const doDelete = async () => {
    await onDelete?.(user);
    closeDeleteConfirm();
  };

  const togglePassword = () => {
    setPwError("");
    setShowPassword((v) => !v);
  };

  const handleChangePassword = async () => {
    setPwError("");

    const current = (pw.current || "").trim();
    const next = (pw.next || "").trim();

    if (!current) return setPwError(t("editUser.password.errors.currentRequired"));
    if (!next) return setPwError(t("editUser.password.errors.newRequired"));
    if (next.length < 8) return setPwError(t("editUser.password.errors.newMin"));

    try {
      await onChangePassword?.(user?.user_id, current, next);
      setPw({ current: "", next: "" });
      setShowPassword(false);
    } catch {
      // parent shows apiError
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-card modal-card-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">{t("editUser.title")}</div>
            <div className="modal-subtitle">{user?.username}</div>
          </div>

          <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div className="modal-grid">
            <div className="modal-field">
              <label htmlFor="edit-username">{t("editUser.labels.username")}</label>

              <div className="locked-field" title={t("editUser.usernameCantChange")}>
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
                  {t("editUser.usernameCantChangeTooltip")}
                </span>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="edit-email">{t("editUser.labels.email")}</label>
              <input
                id="edit-email"
                name="email"
                type="email"
                className="field-input"
                value={form.email}
                onChange={setField("email")}
                disabled={busy}
                autoComplete="email"
              />
            </div>

            <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="edit-fullname">{t("editUser.labels.fullName")}</label>
              <input
                id="edit-fullname"
                name="full_name"
                className="field-input"
                value={form.full_name}
                onChange={setField("full_name")}
                disabled={busy}
                autoComplete="name"
              />
            </div>

            <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="edit-role">{t("editUser.labels.role")}</label>
              <select
                id="edit-role"
                name="role_id"
                className="field-input field-select field-select-sm"
                value={form.role_id}
                onChange={setField("role_id")}
                disabled={busy}
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {t("editUser.buttons.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {saving ? t("editUser.buttons.saving") : t("editUser.buttons.saveChanges")}
            </Button>
          </div>

          <div className="danger-zone">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div className="danger-title" style={{ color: "#111827" }}>
                  {t("editUser.password.title")}
                </div>
                <div className="danger-desc">{t("editUser.password.desc")}</div>
              </div>

              <Button type="button" variant="secondary" onClick={togglePassword} disabled={busy}>
                {showPassword ? t("editUser.password.toggleShow") : t("editUser.password.toggleHide")}
              </Button>
            </div>

            <div style={{ overflow: "hidden", maxHeight: showPassword ? 260 : 0, transition: "max-height 220ms ease" }}>
              <div style={{ paddingTop: showPassword ? 12 : 0 }}>
                <div className="modal-grid">
                  <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="edit-current-password">{t("editUser.password.current")}</label>
                    <input
                      id="edit-current-password"
                      name="current_password"
                      type="password"
                      className="field-input"
                      value={pw.current}
                      onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                      disabled={pwBusy}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="edit-new-password">{t("editUser.password.new")}</label>
                    <input
                      id="edit-new-password"
                      name="new_password"
                      type="password"
                      className="field-input"
                      value={pw.next}
                      onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                      disabled={pwBusy}
                      autoComplete="new-password"
                    />
                    {pwError && <div className="field-error">{pwError}</div>}
                  </div>
                </div>

                <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleChangePassword}
                    disabled={pwBusy || !onChangePassword}
                  >
                    {pwBusy ? t("editUser.password.updating") : t("editUser.password.update")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="danger-zone">
            <div className="danger-title">{t("editUser.danger.title")}</div>
            <div className="danger-desc">{t("editUser.danger.desc")}</div>

            <Button
              type="button"
              variant="secondary"
              onClick={openDeleteConfirm}
              disabled={disableDelete || busy}
            >
              {deleting ? t("editUser.danger.deleting") : t("editUser.danger.delete")}
            </Button>
          </div>

          {disableDelete && (
            <div className="danger-hint" style={{ marginTop: 8 }}>
              {t("editUser.danger.cannotDeleteHint")}
            </div>
          )}
        </form>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t("editUser.confirmDelete.title")}
        description={t("editUser.confirmDelete.description", { username: user?.username })}
        confirmText={t("editUser.confirmDelete.confirm")}
        cancelText={t("editUser.confirmDelete.cancel")}
        loading={deleting}
        disabled={disableDelete}
        onCancel={closeDeleteConfirm}
        onConfirm={doDelete}
      />
    </div>
  );
};

export default EditUserModal;