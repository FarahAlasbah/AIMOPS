import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../shared/components";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";

const ROLE_TO_ID = {
  "Marketing User": 2,
  "Business Owner": 3,
  Administrator: 1,
};

const ROLE_OPTIONS = [
  { value: 2, label: "Marketing User" },
  { value: 3, label: "Business Owner" },
];

const EditUserModal = ({
  user,
  onClose,
  onSave,
  saving,

  onDelete,
  deleting,
  disableDelete,

  // Password change
  onChangePassword,
  changingPassword,
}) => {
  const initial = useMemo(() => {
    const role_id = ROLE_TO_ID[user?.role_name] || 2;

    return {
      username: user?.username || "",
      email: user?.email || "",
      full_name: user?.full_name || "",
      role_id,
    };
  }, [user]);

  const [form, setForm] = useState(initial);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Collapsible password section
  const [showPassword, setShowPassword] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwError, setPwError] = useState("");

  useEffect(() => setForm(initial), [initial]);

  // Main form busy state (save/delete only)
  const busy = !!(saving || deleting);

  // Password area busy state (only while changing password)
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

    if (!current) return setPwError("Current password is required.");
    if (!next) return setPwError("New password is required.");
    if (next.length < 8) return setPwError("New password must be at least 8 characters.");

    try {
      await onChangePassword?.(user?.user_id, current, next);
      setPw({ current: "", next: "" });
      setShowPassword(false);
    } catch {
      // parent shows apiError; keep section open
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card modal-card-scroll">
        <div className="modal-header">
          <div>
            <div className="modal-title">Edit user</div>
            <div className="modal-subtitle">{user?.username}</div>
          </div>

          <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Scrollable content to keep UI compact */}
        <form
          onSubmit={submit}
          className="modal-body"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          <div className="modal-grid">
            <div className="modal-field">
              <label htmlFor="edit-username">Username</label>

              <div className="locked-field" title="Username can't be changed">
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
                  Username can’t be changed
                </span>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="edit-email">Email</label>
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
              <label htmlFor="edit-fullname">Full name</label>
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
              <label htmlFor="edit-role">Role</label>
              <select
                id="edit-role"
                name="role_id"
                className="field-input field-select field-select-sm"
                value={form.role_id}
                onChange={setField("role_id")}
                disabled={busy}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>

          {/* Collapsible password section */}
          <div className="danger-zone">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div className="danger-title" style={{ color: "#111827" }}>
                  Password
                </div>
                <div className="danger-desc">
                  New password must be at least 8 characters.
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={togglePassword}
                disabled={busy}
              >
                {showPassword ? "Hide" : "Change"}
              </Button>
            </div>

            <div
              style={{
                overflow: "hidden",
                maxHeight: showPassword ? 260 : 0,
                transition: "max-height 220ms ease",
              }}
            >
              <div style={{ paddingTop: showPassword ? 12 : 0 }}>
                <div className="modal-grid">
                  <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="edit-current-password">Current password</label>
                    <input
                      id="edit-current-password"
                      name="current_password"
                      type="password"
                      className="field-input"
                      value={pw.current}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, current: e.target.value }))
                      }
                      disabled={pwBusy}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="edit-new-password">New password</label>
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
                    {pwBusy ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone (delete) */}
          <div className="danger-zone">
            <div className="danger-title">Danger zone</div>
            <div className="danger-desc">
              Deleting a user can be undone for a short time from the Undo bar.
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={openDeleteConfirm}
              disabled={disableDelete || busy}
            >
              {deleting ? "Deleting..." : "Delete user"}
            </Button>
          </div>

          {disableDelete && (
            <div className="danger-hint" style={{ marginTop: 8 }}>
              You can’t delete yourself or the Administrator account.
            </div>
          )}
        </form>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete user?"
        description={`This will delete "${user?.username}". You can undo shortly from the Undo bar.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        disabled={disableDelete}
        onCancel={closeDeleteConfirm}
        onConfirm={doDelete}
      />
    </div>
  );
};

export default EditUserModal;
