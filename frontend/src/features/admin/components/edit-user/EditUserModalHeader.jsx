function EditUserModalHeader({ user, t, busy, pwBusy, onClose }) {
  return (
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
        onClick={onClose}
        aria-label={t("common.close", {
          defaultValue: "Close",
        })}
        disabled={busy || pwBusy}
      >
        ×
      </button>
    </div>
  );
}

export default EditUserModalHeader;