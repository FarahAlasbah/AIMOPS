import { useCallback, useState } from "react";

import {
  changeUserPassword,
  createUser,
  deleteUser,
  getUsers,
  reactivateUser,
  updateUser,
  updateUserRole,
} from "../../../api/users";

import {
  emptyApiError,
  formatApiError,
  normalizeErrorState,
  tAdmin,
} from "../utils/userApiErrorUtils";

import { normalizeUsersResponse } from "../utils/userNormalizers";

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiErrorState, setApiErrorState] = useState(emptyApiError);

  const setApiError = useCallback((value) => {
    setApiErrorState(normalizeErrorState(value));
  }, []);

  const clearApiError = useCallback(() => {
    setApiErrorState(emptyApiError());
  }, []);

  const runUserAction = useCallback(
    async (action, fallbackMessage) => {
      try {
        clearApiError();
        return await action();
      } catch (error) {
        const formatted = formatApiError(error, fallbackMessage);
        setApiErrorState(formatted);
        throw error;
      }
    },
    [clearApiError],
  );

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      clearApiError();

      const raw = await getUsers();
      setUsers(normalizeUsersResponse(raw));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setApiErrorState(formatApiError(error, tAdmin("apiErrors.loadUsers")));
    } finally {
      setLoading(false);
    }
  }, [clearApiError]);

  const addUser = useCallback(
    async (payload) =>
      runUserAction(
        () => createUser(payload),
        tAdmin("apiErrors.createUser"),
      ),
    [runUserAction],
  );

  const changeRole = useCallback(
    async (userId, roleId) =>
      runUserAction(
        () => updateUserRole(userId, roleId),
        tAdmin("apiErrors.updateRole"),
      ),
    [runUserAction],
  );

  const updateUserInfo = useCallback(
    async (userId, payload) =>
      runUserAction(
        () => updateUser(userId, payload),
        tAdmin("apiErrors.updateUser"),
      ),
    [runUserAction],
  );

  const removeUser = useCallback(
    async (userId) =>
      runUserAction(
        () => deleteUser(userId),
        tAdmin("apiErrors.deleteUser"),
      ),
    [runUserAction],
  );

  const undoDelete = useCallback(
    async (userId) =>
      runUserAction(
        () => reactivateUser(userId),
        tAdmin("apiErrors.restoreUser"),
      ),
    [runUserAction],
  );

  const changePassword = useCallback(
    async (userId, currentPassword, newPassword) =>
      runUserAction(
        () => changeUserPassword(userId, currentPassword, newPassword),
        tAdmin("apiErrors.updatePassword"),
      ),
    [runUserAction],
  );

  return {
    users,
    loading,

    apiError: apiErrorState.message,
    apiFieldErrors: apiErrorState.fieldErrors,
    apiStatus: apiErrorState.status,
    apiErrorState,

    setApiError,
    clearApiError,

    fetchUsers,
    addUser,
    changeRole,
    updateUserInfo,
    removeUser,
    undoDelete,
    changePassword,
  };
};