import { Card, Button } from "../../../shared/components";
import { useTranslation } from "react-i18next";

const ROLE_BADGE_BY_NAME = {
  Administrator: "admin",
  "Marketing User": "marketing_user",
  "Business Owner": "business_owner",
};

const UsersCardsList = ({ users, loading, onEdit }) => {
  const { t } = useTranslation("admin");

  return (
    <Card title={t("users.systemUsers")}>
      {loading ? (
        <div className="loading-state">
          <p>{t("users.loading")}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>{t("users.empty")}</p>
        </div>
      ) : (
        <div className="users-cards">
          {users.map((u) => (
            <div key={u.user_id} className="user-card">
              <div className="user-card-top">
                <div className="user-card-title">
                  <div className="user-card-username">{u.username}</div>
                  <div className="user-card-name">{u.full_name}</div>
                </div>

                <span className={`role-badge role-${ROLE_BADGE_BY_NAME[u.role_name] || "unknown"}`}>
                  {u.role_name || t("users.unknownRole")}
                </span>
              </div>

              <div className="user-card-email">{u.email}</div>

              <div className="user-card-actions">
                <Button type="button" variant="secondary" onClick={() => onEdit(u)}>
                  {t("users.edit")}
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
