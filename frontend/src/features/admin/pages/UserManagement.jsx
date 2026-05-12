import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../../shared/contexts/AuthContext";
import { Button, InfoMessage } from "../../../shared/components";
import { isAdminUser } from "../../../shared/permissions/rolePermissions";

import { useUsers } from "../hooks/useUsers";
import AccessDenied from "../components/AccessDenied";
import CreateUserCard from "../components/CreateUserCard";
import UsersTableCard from "../components/UsersTableCard";
import EditUserModal from "../components/EditUserModal";

import "./UserManagement.css";

const UserManagement = () => {
  const { user } = useAuth();
  const { t } = useTranslation("admin");

  const currentUserIsAdmin = isAdminUser(user);

  const {
    users,
    loading,

    apiError,
    apiFieldErrors,
    setApiError,
    clearApiError,

    fetchUsers,
    addUser,
    updateUserInfo,
    removeUser,
    undoDelete,
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
  const successTimerRef = useRef(null);

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const clearSuccessTimer = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };

  const setTimedSuccess = (message, duration = 4000) => {
    clearSuccessTimer();
    setSuccessMessage(message);

    successTimerRef.current = setTimeout(() => {
      setSuccessMessage("");
      successTimerRef.current = null;
    }, duration);
  };

  const showUndoMessage = (deletedUser) => {
    clearUndoTimer();

    setUndoInfo({
      user_id: deletedUser.user_id ?? deletedUser.id,
      username: deletedUser.username,
    });

    undoTimerRef.current = setTimeout(() => {
      setUndoInfo(null);
      undoTimerRef.current = null;
    }, 8000);
  };

  useEffect(() => {
    if (currentUserIsAdmin) {
      fetchUsers();
    }
  }, [currentUserIsAdmin, fetchUsers]);

  useEffect(() => {
    return () => {
      clearUndoTimer();
      clearSuccessTimer();
    };
  }, []);

  const openCreateForm = () => {
    clearApiError();
    setSuccessMessage("");
    setEditingUser(null);
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    clearApiError();
    setShowCreateForm(false);
  };

  const openEditModal = (selectedUser) => {
    clearApiError();
    setSuccessMessage("");
    setShowCreateForm(false);
    setEditingUser(selectedUser);
  };

  const closeEditModal = () => {
    clearApiError();
    setEditingUser(null);
  };

  const handleCreate = async (payload) => {
    clearApiError();
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await addUser(payload);

      setShowCreateForm(false);

      setTimedSuccess(
        t("userManagement.success.userCreated", {
          username: payload.username,
          defaultValue: `User ${payload.username} was created successfully.`,
        }),
        5000,
      );

      await fetchUsers();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async (payload) => {
    if (!editingUser?.user_id) return;

    if (!payload || Object.keys(payload).length === 0) {
      setEditingUser(null);
      clearApiError();
      return;
    }

    clearApiError();
    setSuccessMessage("");
    setSavingEdit(true);

    try {
      await updateUserInfo(editingUser.user_id, payload);

      setEditingUser(null);
      await fetchUsers();

      setTimedSuccess(
        t("userManagement.success.userUpdated", {
          defaultValue: "User was updated successfully.",
        }),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteFromModal = async (selectedUser) => {
    if (!selectedUser?.user_id) return;

    clearApiError();
    setSuccessMessage("");
    setDeleting(true);

    try {
      await removeUser(selectedUser.user_id);

      setEditingUser(null);
      await fetchUsers();
      showUndoMessage(selectedUser);
    } finally {
      setDeleting(false);
    }
  };

  const handleUndoDelete = async () => {
    if (!undoInfo?.user_id) return;

    clearApiError();
    setSuccessMessage("");

    try {
      const { user_id, username } = undoInfo;

      await undoDelete(user_id);

      setUndoInfo(null);
      clearUndoTimer();

      await fetchUsers();

      setTimedSuccess(
        t("userManagement.success.userRestored", {
          username,
          defaultValue: `User ${username} was restored successfully.`,
        }),
      );
    } catch {
      // The hook already stores and displays the API error.
    }
  };

  const handleChangePassword = async (userId, currentPassword, newPassword) => {
    if (!currentUserIsAdmin) {
      setApiError(
        t("userManagement.errors.adminOnlyPassword", {
          defaultValue: "Only administrators can change user passwords.",
        }),
      );

      throw new Error("Only administrators can change user passwords.");
    }

    clearApiError();
    setSuccessMessage("");
    setChangingPassword(true);

    try {
      if (typeof changePassword !== "function") {
        setApiError(
          t("userManagement.errors.changePasswordMissing", {
            defaultValue: "Password update API is not connected.",
          }),
        );

        throw new Error("Password update API is not connected.");
      }

      await changePassword(userId, currentPassword, newPassword);

      setTimedSuccess(
        t("userManagement.success.passwordChanged", {
          defaultValue: "Password was updated successfully.",
        }),
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (!currentUserIsAdmin) {
    return <AccessDenied />;
  }

  const showPageApiError = apiError && !showCreateForm && !editingUser;

  return (
    <div className="user-management-page">
      {successMessage && (
        <div className="page-message" aria-live="polite">
          <InfoMessage type="success">{successMessage}</InfoMessage>
        </div>
      )}

      {showPageApiError && (
        <div className="page-message" aria-live="polite">
          <InfoMessage type="error">{apiError}</InfoMessage>
        </div>
      )}

      {undoInfo && (
        <div className="undo-bar">
          <span>
            {t("userManagement.undo.deleted", {
              username: undoInfo.username,
              defaultValue: `${undoInfo.username} was deleted.`,
            })}
          </span>

          <Button type="button" variant="secondary" onClick={handleUndoDelete}>
            {t("userManagement.undo.button", {
              defaultValue: "Undo",
            })}
          </Button>
        </div>
      )}

      {!showCreateForm && (
        <div className="user-management-toolbar">
          <Button type="button" onClick={openCreateForm}>
            {t("userManagement.buttons.createUser", {
              defaultValue: "Create new user",
            })}
          </Button>
        </div>
      )}

      {showCreateForm && (
        <div className="create-user-section">
          <CreateUserCard
            apiError={apiError}
            fieldErrors={apiFieldErrors}
            onClearError={clearApiError}
            onCancel={closeCreateForm}
            onCreate={handleCreate}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      <UsersTableCard
        users={users}
        loading={loading}
        errorMessage={apiError}
        onRetry={fetchUsers}
        onEdit={openEditModal}
      />

      {editingUser && (
        <EditUserModal
          user={editingUser}
          apiError={apiError}
          fieldErrors={apiFieldErrors}
          onClearError={clearApiError}
          saving={savingEdit}
          deleting={deleting}
          disableDelete={
            editingUser.user_id === user?.user_id ||
            editingUser.role_name === "Administrator"
          }
          canChangePassword={currentUserIsAdmin}
          onClose={closeEditModal}
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