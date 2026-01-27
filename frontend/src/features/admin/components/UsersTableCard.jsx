// frontend/src/features/admin/components/UsersTableCard.jsx
import { Card } from '../../../shared/components';
import { Pencil } from 'lucide-react';

const ROLE_BADGE_BY_NAME = {
  Administrator: 'admin',
  'Marketing User': 'marketing_user',
  'Business Owner': 'business_owner',
};

const UsersTableCard = ({ users, loading, onEdit }) => {
  const badge = (u) => ROLE_BADGE_BY_NAME[u.role_name] || 'unknown';

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
        // add wrapper class on the table container (only this line change)
      <div className="users-table-wrapper users-table-desktop">

        <div className="users-table-wrapper">
          <table className="users-table users-table-clean">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th style={{ width: 56, textAlign: 'right' }} />
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
                      {u.role_name || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Edit user"
                      title="Edit"
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
      </div>
      )}
    </Card>
  );
};

export default UsersTableCard;
