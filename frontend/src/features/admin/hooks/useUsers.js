// frontend/src/features/admin/hooks/useUsers.js
import { useCallback, useState } from "react";
import {
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
  reactivateUser,
  updateUser,
  changeUserPassword, // make sure this exists in api/users.js
} from "../../../api/users";

const formatApiError = (error) => {
  const data = error?.response?.data || error;
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        const field = Array.isArray(e?.loc) ? e.loc[e.loc.length - 1] : "";
        const msg = e?.msg || "Validation error";
        return field ? `${field}: ${msg}` : msg;
      })
      .join(" | ");
  }

  if (detail && typeof detail === "object")
    return detail?.msg || "Validation error";

  return data?.message || error?.message || "Something went wrong";
};

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const raw = await getUsers();

      // raw is already an array in your response, but keep it safe anyway
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.users)
          ? raw.users
          : Array.isArray(raw?.data)
            ? raw.data
            : [];

      // Normalize + add compatibility fields for UI components
      const normalized = list.map((u) => {
        const status = (u.status || "").toLowerCase(); // "active" / "inactive" / ...
        return {
          ...u,

          // common aliases some components expect
          id: u.user_id ?? u.id,
          name: u.full_name ?? u.name ?? "",
          role: u.role_name ?? u.role ?? "",
          is_active: status === "active",
          status, // keep normalized lower-case
        };
      });

      setUsers(normalized);
      setApiError("");
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setApiError(formatApiError(error)); // show real backend error if any
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addUser = useCallback(async (payload) => {
    try {
      setApiError("");
      return await createUser(payload);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  // RESTORED: changeRole (this is what your error complains about)
  const changeRole = useCallback(async (userId, roleId) => {
    try {
      setApiError("");
      return await updateUserRole(userId, roleId);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const updateUserInfo = useCallback(async (userId, payload) => {
    try {
      setApiError("");
      return await updateUser(userId, payload);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const removeUser = useCallback(async (userId) => {
    try {
      setApiError("");
      await deleteUser(userId);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const undoDelete = useCallback(async (userId) => {
    try {
      setApiError("");
      await reactivateUser(userId);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  // Password change (used by your UserManagement.jsx)
  const changePassword = useCallback(
    async (userId, currentPassword, newPassword) => {
      try {
        setApiError("");
        return await changeUserPassword(userId, currentPassword, newPassword);
      } catch (error) {
        setApiError(formatApiError(error));
        throw error;
      }
    },
    [],
  );

  return {
    users,
    loading,
    apiError,
    setApiError,
    fetchUsers,
    addUser,
    changeRole, // now defined
    updateUserInfo,
    removeUser,
    undoDelete,
    changePassword, // for EditUserModal
  };
};
