import { useTranslation } from "react-i18next";
import { ROLE_DEFS, normalizeRole, roleLabel } from "../../utils/analysisUtils";

function RolePills({ value, onChange, disabled }) {
  const { t } = useTranslation("upload");
  const current = normalizeRole(value);

  return (
    <div className="role-picker">
      <div className="role-pills">
        {ROLE_DEFS.map((role) => {
          const active = current === role.value;
          const isSkip = role.value === "skip";

          return (
            <button
              key={role.value}
              type="button"
              className={`role-pill ${active ? "active" : ""} ${
                isSkip ? "skip" : ""
              }`}
              onClick={() => !disabled && onChange(role.value)}
              aria-pressed={active}
              disabled={!!disabled}
              title={disabled ? t("mapping.lockedBatch") : ""}
            >
              {roleLabel(role.value, t)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RolePickerWithConfirm({
  colIndex,
  value,
  suggested,
  pendingMap,
  setPendingMap,
  onCommitRole,
  disabled,
}) {
  const { t } = useTranslation("upload");

  const committed = normalizeRole(value);
  const suggestedRole = normalizeRole(suggested);

  const pendingRole = pendingMap?.[colIndex]
    ? normalizeRole(pendingMap[colIndex])
    : "";

  const displayRole = pendingRole || committed;
  const hasPending = !!pendingRole;

  const commitNow = (role) => {
    setPendingMap?.((prev) => {
      const copy = { ...(prev || {}) };
      delete copy[colIndex];
      return copy;
    });

    onCommitRole?.(colIndex, role);
  };

  const setPending = (role) => {
    setPendingMap?.((prev) => ({
      ...(prev || {}),
      [colIndex]: role,
    }));
  };

  const clearPending = () => {
    setPendingMap?.((prev) => {
      const copy = { ...(prev || {}) };
      delete copy[colIndex];
      return copy;
    });
  };

  const handlePick = (nextRoleRaw) => {
    if (disabled) return;

    const nextRole = normalizeRole(nextRoleRaw);

    if (!suggestedRole || nextRole === suggestedRole) {
      commitNow(nextRole);
      return;
    }

    setPending(nextRole);
  };

  return (
    <div style={{ width: "100%" }}>
      <RolePills
        value={displayRole}
        onChange={handlePick}
        disabled={disabled}
      />

      {!disabled && !hasPending && suggestedRole && committed !== suggestedRole ? (
        <div className="role-warn">
          {t("mapping.notSuggestedRole")}{" "}
          <strong>{roleLabel(suggestedRole, t)}</strong>
        </div>
      ) : null}

      {!disabled && hasPending ? (
        <div className="role-change-confirm">
          <div
            className="role-change-text"
            dangerouslySetInnerHTML={{
              __html: t("mapping.roleChangePrompt", {
                selected: roleLabel(pendingRole, t),
                suggested: roleLabel(suggestedRole || "skip", t),
              }),
            }}
          />

          <div className="role-change-actions">
            <button type="button" className="mini-btn" onClick={clearPending}>
              {t("mapping.cancel")}
            </button>

            <button
              type="button"
              className="mini-btn primary"
              onClick={() => commitNow(pendingRole)}
            >
              {t("mapping.confirmChange")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}