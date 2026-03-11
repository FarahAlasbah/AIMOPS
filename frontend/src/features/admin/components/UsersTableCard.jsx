// frontend/src/features/admin/components/UsersTableCard.jsx
import { Card } from "../../../shared/components";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

const ROLE_BADGE_BY_NAME = {
  Administrator: "admin",
  "Marketing User": "marketing_user",
  "Business Owner": "business_owner",
};

const UsersTableSkeleton = ({ rows = 6 }) => (
  <>
    {/* Desktop skeleton */}
    <div className="users-table-wrapper users-table-desktop">
      <table className="users-table users-table-clean">
        <thead>
          <tr>
            <th>User name</th>
            <th>Full name</th>
            <th>Email</th>
            <th>Role</th>
            <th style={{ width: 56, textAlign: "right" }} />
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={`table-skel-${i}`}>
              <td><div className="skel skel-text skel-w-sm" /></td>
              <td><div className="skel skel-text skel-w-md" /></td>
              <td><div className="skel skel-text skel-w-lg" /></td>
              <td><div className="skel skel-pill" /></td>
              <td style={{ textAlign: "right" }}>
                <div className="skel skel-icon" style={{ marginInlineStart: "auto" }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile skeleton */}
    <div className="users-cards users-cards-skeleton">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`card-skel-${i}`} className="user-card user-card-skeleton">
          <div className="user-card-top">
            <div style={{ flex: 1 }}>
              <div className="skel skel-text skel-w-sm" />
              <div className="skel skel-text skel-w-md" style={{ marginTop: 8 }} />
              <div className="skel skel-text skel-w-lg" style={{ marginTop: 10 }} />
            </div>

            <div className="skel skel-pill" />
          </div>

          <div className="user-card-actions">
            <div className="skel skel-icon" />
          </div>
        </div>
      ))}
    </div>
  </>
);

const UsersTableCard = ({ users, loading, onEdit }) => {
  const { t } = useTranslation("admin");
  const badge = (u) => ROLE_BADGE_BY_NAME[u.role_name] || "unknown";

  return (
    <Card title={t("users.systemUsers")}>
      {loading ? (
        <UsersTableSkeleton />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>{t("users.empty")}</p>
        </div>
      ) : (
        <>
          {/* Desktop / wide screens */}
          <div className="users-table-wrapper users-table-desktop">
            <table className="users-table users-table-clean">
              <thead>
                <tr>
                  <th>{t("editUser.labels.username")}</th>
                  <th>{t("editUser.labels.fullName")}</th>
                  <th>{t("editUser.labels.email")}</th>
                  <th>{t("editUser.labels.role")}</th>
                  <th style={{ width: 56, textAlign: "right" }} />
                </tr>
              </thead>

              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="username-cell">{u.username}</td>
                    <td>{u.full_name}</td>
                    <td className="cell-muted">{u.email}</td>
                    <td>
                      <span className={`role-badge role-${badge(u)}`}>
                        {u.role_name || t("users.unknownRole")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t("users.editAria")}
                        title={t("users.edit")}
                        onClick={() => onEdit(u)}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tablet / small screens */}
          <div className="users-cards">
            {users.map((u) => (
              <div key={u.user_id} className="user-card">
                <div className="user-card-top">
                  <div>
                    <div className="user-card-username">{u.username}</div>
                    <div className="user-card-name">{u.full_name}</div>
                    <div className="user-card-email">{u.email}</div>
                  </div>

                  <span className={`role-badge role-${badge(u)}`}>
                    {u.role_name || t("users.unknownRole")}
                  </span>
                </div>

                <div className="user-card-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t("users.editAria")}
                    title={t("users.edit")}
                    onClick={() => onEdit(u)}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default UsersTableCard;