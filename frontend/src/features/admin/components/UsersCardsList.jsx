import { Card, Button } from "../../../shared/components";
import { useTranslation } from "react-i18next";

const ROLE_BADGE_BY_NAME = {
  Administrator: "admin",
  "Marketing User": "marketing_user",
  "Business Owner": "business_owner",
};

const UsersCardsList = ({
  users = [],
  loading,
  onEdit,
  errorMessage = "",
  onRetry,
}) => {
  const { t } = useTranslation("admin");

  return (
    <Card
      title={t("users.systemUsers", {
        defaultValue: "System users",
      })}
    >
      {loading ? (
        <div className="loading-state">
          <p>
            {t("users.loading", {
              defaultValue: "Loading users...",
            })}
          </p>
        </div>
      ) : errorMessage && users.length === 0 ? (
        <div className="table-error-state" role="alert">
          <div className="table-error-title">
            {t("users.loadErrorTitle", {
              defaultValue: "Could not load users",
            })}
          </div>

          <p>{errorMessage}</p>

          {typeof onRetry === "function" && (
            <Button type="button" variant="secondary" onClick={onRetry}>
              {t("users.retry", {
                defaultValue: "Try again",
              })}
            </Button>
          )}
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>
            {t("users.empty", {
              defaultValue: "No users found.",
            })}
          </p>
        </div>
      ) : (
        <div className="users-cards users-cards-force">
          {users.map((u) => (
            <div key={u.user_id ?? u.id} className="user-card">
              <div className="user-card-top">
                <div className="user-card-title">
                  <div className="user-card-username">
                    {u.username ||
                      t("users.unknownUser", {
                        defaultValue: "Unknown",
                      })}
                  </div>
                  <div className="user-card-name">{u.full_name || "-"}</div>
                </div>

                <span
                  className={`role-badge role-${
                    ROLE_BADGE_BY_NAME[u.role_name] || "unknown"
                  }`}
                >
                  {u.role_name ||
                    t("users.unknownRole", {
                      defaultValue: "Unknown role",
                    })}
                </span>
              </div>

              <div className="user-card-email">{u.email || "-"}</div>

              <div className="user-card-actions">
                <Button type="button" variant="secondary" onClick={() => onEdit(u)}>
                  {t("users.edit", {
                    defaultValue: "Edit",
                  })}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default UsersCardsList;