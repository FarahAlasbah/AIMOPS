import { Card } from '../../../shared/components';

const UsersTableCard = ({ users, loading }) => {
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
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td className="username-cell">{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-${u.role?.role_name || 'unknown'}`}>
                      {u.role?.display_name || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${u.status}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default UsersTableCard;
