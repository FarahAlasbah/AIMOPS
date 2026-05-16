import { Button } from "../../../../shared/components";

function EditUserDangerZone({
  t,
  deleting,
  disableDelete,
  busy,
  onOpenDeleteConfirm,
}) {
  return (
    <div className="danger-zone">
      <div className="danger-title">
        {t("editUser.danger.title", {
          defaultValue: "Danger zone",
        })}
      </div>

      <div className="danger-desc">
        {t("editUser.danger.desc", {
          defaultValue: "Deleting this user will deactivate their account.",
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={onOpenDeleteConfirm}
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
  );
}

export default EditUserDangerZone;