// frontend/src/features/admin/pages/UserManagement.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { PageHeader, Button, InfoMessage } from "../../../shared/components";
import { useUsers } from "../hooks/useUsers";

import AccessDenied from "../components/AccessDenied";
import CreateUserCard from "../components/CreateUserCard";
import UsersTableCard from "../components/UsersTableCard";
import EditUserModal from "../components/EditUserModal";

import "./UserManagement.css";

const UserManagement = () => {
  const { user } = useAuth();

  const {
    users,
    loading,
    apiError,
    setApiError,
    fetchUsers,
    addUser,
    updateUserInfo,
    removeUser,
    undoDelete,

    // NEW (must exist in useUsers hook)
    changePassword,
  } = useUsers();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [undoInfo, setUndoInfo] = useState(null);

  const [changingPassword, setChangingPassword] = useState(false);

  const undoTimerRef = useRef(null);

  // NEW

  useEffect(() => {
    if (user?.is_admin) fetchUsers();
  }, [user, fetchUsers]);

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const showUndoMessage = (deletedUser) => {
    clearUndoTimer();
    setUndoInfo({
      user_id: deletedUser.user_id,
      username: deletedUser.username,
    });

    undoTimerRef.current = setTimeout(() => {
      setUndoInfo(null);
    }, 8000);
  };

  const handleCreate = async (payload) => {
    setApiError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await addUser(payload);
      setSuccessMessage(`User "${payload.username}" created successfully!`);
      setShowCreateForm(false);
      await fetchUsers();
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  };

  const handleEditSave = async (payload) => {
    if (!editingUser?.user_id) return;

    if (!payload || Object.keys(payload).length === 0) {
      setEditingUser(null);
      return;
    }

    setApiError("");
    setSuccessMessage("");
    setSavingEdit(true);

    try {
      await updateUserInfo(editingUser.user_id, payload);
      setEditingUser(null);
      await fetchUsers();

      setSuccessMessage("User updated successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteFromModal = async (u) => {
    setApiError("");
    setSuccessMessage("");
    setDeleting(true);

    try {
      await removeUser(u.user_id);
      setEditingUser(null); // close modal
      await fetchUsers();
      showUndoMessage(u);
    } finally {
      setDeleting(false);
    }
  };

  const handleUndoDelete = async () => {
    if (!undoInfo?.user_id) return;

    setApiError("");
    setSuccessMessage("");

    try {
      const { user_id, username } = undoInfo;

      await undoDelete(user_id);
      setUndoInfo(null);
      clearUndoTimer();

      await fetchUsers();

      setSuccessMessage(`User "${username}" restored successfully!`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch {
      // apiError handled in hook
    }
  };
//   const handleChangePassword = async (userId, currentPassword, newPassword) => {
//   setApiError('');
//   setSuccessMessage('');
//   setChangingPassword(true);

//   try {
//     await changePassword(userId, currentPassword, newPassword);
//     setSuccessMessage('Password changed successfully!');
//     setTimeout(() => setSuccessMessage(''), 4000);
//   } finally {
//     setChangingPassword(false);
//   }
// };

  // NEW: password change handler for EditUserModal
  const handleChangePassword = async (userId, currentPassword, newPassword) => {
    setApiError("");
    setSuccessMessage("");
    setChangingPassword(true);

    try {
      if (typeof changePassword !== "function") {
        setApiError("changePassword is not available. Update useUsers hook first.");
        return;
      }

      await changePassword(userId, currentPassword, newPassword);

      setSuccessMessage("Password changed successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user?.is_admin) return <AccessDenied />;

  return (
    <div className="user-management-page">
      <PageHeader
        title="User Management"
        subtitle="Create and manage users"
        actions={
          !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              + Create New User
            </Button>
          )
        }
      />

      {successMessage && (
        <InfoMessage type="success">{successMessage}</InfoMessage>
      )}
      {apiError && <InfoMessage type="error">{apiError}</InfoMessage>}

      {undoInfo && (
        <div className="undo-bar">
          <span>
            User <strong>{undoInfo.username}</strong> deleted.
          </span>
          <Button type="button" variant="secondary" onClick={handleUndoDelete}>
            Undo
          </Button>
        </div>
      )}

      {showCreateForm && (
        <CreateUserCard
          apiError={apiError}
          onCancel={() => {
            setShowCreateForm(false);
            setApiError("");
          }}
          onCreate={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}

      <UsersTableCard
        users={users}
        loading={loading}
        onEdit={(u) => setEditingUser(u)}
      />

      {editingUser && (
        <EditUserModal
          user={editingUser}
          saving={savingEdit}
          deleting={deleting}
          disableDelete={
            editingUser.user_id === user?.user_id ||
            editingUser.role_name === "Administrator"
          }
          onClose={() => setEditingUser(null)}
          onSave={handleEditSave}
          onDelete={handleDeleteFromModal}
          onChangePassword={handleChangePassword}
          changingPassword={changingPassword}
        />
      )}
    </div>
  );
};

export default UserManagement;
