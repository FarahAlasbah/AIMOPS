// frontend/src/features/admin/components/UsersCardsList.jsx
import { Card, Button } from '../../../shared/components';

const ROLE_BADGE_BY_NAME = {
  Administrator: 'admin',
  'Marketing User': 'marketing_user',
  'Business Owner': 'business_owner',
};

const UsersCardsList = ({ users, loading, onEdit }) => {
  return (
    <Card title="System Users">
      {loading ? (
        <div className="loading-state">
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>No users found. Create your first user!</p>
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

                <span className={`role-badge role-${ROLE_BADGE_BY_NAME[u.role_name] || 'unknown'}`}>
                  {u.role_name || 'Unknown'}
                </span>
              </div>

              <div className="user-card-email">{u.email}</div>

              <div className="user-card-actions">
                <Button type="button" variant="secondary" onClick={() => onEdit(u)}>
                  Edit
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
