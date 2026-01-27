// frontend/src/features/admin/components/EditUserModal.jsx
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

  // UI confirm modal (instead of window.confirm)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => setForm(initial), [initial]);

  const setField = (k) => (e) => {
    const v = k === "role_id" ? Number(e.target.value) : e.target.value;
    setForm((p) => ({ ...p, [k]: v }));
  };

  const submit = (e) => {
    e.preventDefault();

    const payload = {};
    if (form.email !== initial.email) payload.email = form.email;
    if (form.full_name !== initial.full_name)
      payload.full_name = form.full_name;
    if (form.role_id !== initial.role_id) payload.role_id = form.role_id;

    onSave(payload);
  };

  const openDeleteConfirm = () => setShowDeleteConfirm(true);
  const closeDeleteConfirm = () => setShowDeleteConfirm(false);

  const doDelete = async () => {
    // call parent delete handler then close the confirm
    await onDelete?.(user);
    closeDeleteConfirm();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <div className="modal-title">Edit user</div>
            <div className="modal-subtitle">{user?.username}</div>
          </div>

          <button
            type="button"
            className="modal-x"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="modal-body">
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
                disabled={saving || deleting}
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
                disabled={saving || deleting}
                autoComplete="name"
              />
            </div>

            <div className="modal-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="edit-role">Role</label>
              <select
                id="edit-role"
                name="role_id"
                className="field-input field-select"
                value={form.role_id}
                onChange={setField("role_id")}
                disabled={saving || deleting}
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
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving || deleting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || deleting}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>

          {/* Danger Zone */}
          <div className="danger-zone">
            <div className="danger-title">Danger zone</div>
            <div className="danger-desc">
              Deleting a user can be undone for a short time from the Undo bar.
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={openDeleteConfirm}
              disabled={disableDelete || saving || deleting}
            >
              {deleting ? "Deleting..." : "Delete user"}
            </Button>

            {disableDelete && (
              <div className="danger-hint">
                You can’t delete yourself or the Administrator account.
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Confirm delete modal */}
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
