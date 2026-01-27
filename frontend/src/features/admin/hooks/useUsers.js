// frontend/src/features/admin/hooks/useUsers.js
import { useCallback, useState } from 'react';
import {
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
  reactivateUser,
  updateUser, // NEW
} from '../../../api/users';

const formatApiError = (error) => {
  const data = error?.response?.data || error;
  const detail = data?.detail;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        const field = Array.isArray(e?.loc) ? e.loc[e.loc.length - 1] : '';
        const msg = e?.msg || 'Validation error';
        return field ? `${field}: ${msg}` : msg;
      })
      .join(' | ');
  }

  if (detail && typeof detail === 'object') return detail?.msg || 'Validation error';

  return data?.message || 'Something went wrong';
};

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(Array.isArray(response) ? response : []);
      setApiError('');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setApiError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addUser = useCallback(async (payload) => {
    try {
      setApiError('');
      return await createUser(payload);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const changeRole = useCallback(async (userId, roleId) => {
    try {
      setApiError('');
      return await updateUserRole(userId, roleId);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  // NEW: update any fields (username/email/full_name/role_id/status...)
  const updateUserInfo = useCallback(async (userId, payload) => {
    try {
      setApiError('');
      return await updateUser(userId, payload);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const removeUser = useCallback(async (userId) => {
    try {
      setApiError('');
      await deleteUser(userId);
    } catch (error) {
      setApiError(formatApiError(error));
      throw error;
    }
  }, []);

  const undoDelete = useCallback(async (userId) => {
    try {
      setApiError('');
      await reactivateUser(userId);
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
    updateUserInfo, // NEW
    removeUser,
    undoDelete,
  };
};
