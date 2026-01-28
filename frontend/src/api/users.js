// frontend/src/api/users.js
import api from './api';

// existing:
export const getUsers = async () => (await api.get('/api/users')).data;
export const createUser = async (payload) => (await api.post('/api/users', payload)).data;
export const updateUserRole = async (userId, roleId) =>
  (await api.patch(`/api/users/${userId}`, { role_id: roleId })).data;

export const deleteUser = async (userId) =>
  (await api.delete(`/api/users/${userId}`)).data;

export const reactivateUser = async (userId) =>
  (await api.post(`/api/users/${userId}/reactivate`)).data;

// new: update any user fields (including role_id)
export const updateUser = async (userId, payload) => {
  const res = await api.patch(`/api/users/${userId}`, payload);
  return res.data;
};

export const changeUserPassword = async (userId, current_password, new_password) => {
  const res = await api.post(`/api/users/${userId}/change-password`, {
    current_password,
    new_password,
  });
  return res.data;
};