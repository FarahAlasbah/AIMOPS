import { useCallback, useState } from "react";
import {
  getUsers,
  createUser,
  deleteUser,
  reactivateUser,
  updateUser,
  changeUserPassword, // NEW
} from '../../../api/users';

// ... keep formatApiError as-is
const formatApiError = (err) => {
  const data = err?.response?.data;

  // FastAPI validation errors (Pydantic)
  if (data?.detail && Array.isArray(data.detail)) {
    return data.detail.map((e) => e.msg).join(", ");
  }

  // FastAPI normal error format
  if (typeof data?.detail === "string") return data.detail;

  // Generic axios message
  return err?.message || "Something went wrong";
};

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(Array.isArray(response) ? response : []);
      setApiError("");
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setApiError("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addUser = useCallback(async (payload) => {
    try {
      setApiError("");
      const newUser = await createUser(payload);
      return newUser;
    } catch (error) {
      console.error("Create user error:", error?.response?.data || error);
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const updateUserInfo = useCallback(async (userId, payload) => {
    try {
      setApiError("");
      const updated = await updateUser(userId, payload);
      return updated;
    } catch (error) {
      console.error("Update user error:", error?.response?.data || error);
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const removeUser = useCallback(async (userId) => {
    try {
      setApiError("");
      await deleteUser(userId);
    } catch (error) {
      console.error("Delete user error:", error?.response?.data || error);
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const undoDelete = useCallback(async (userId) => {
    try {
      setApiError("");
      await reactivateUser(userId);
    } catch (error) {
      console.error("Reactivate user error:", error?.response?.data || error);
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  // NEW: change password
  const changePassword = useCallback(async (userId, currentPassword, newPassword) => {
    try {
      setApiError('');
      return await changeUserPassword(userId, currentPassword, newPassword);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  return {
    users,
    loading,
    apiError,
    setApiError,
    fetchUsers,
    addUser,
    changeRole,
    updateUserInfo,
    removeUser,
    undoDelete,
    changePassword, // NEW
  };
};
