import api from './api';

// Get all users (Admin only)
export const getUsers = async () => {
  try {
    const response = await api.get('/api/users');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch users' };
  }
};

// Create user (Admin only)
export const createUser = async (userData) => {
  try {
    const response = await api.post('/api/users', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create user' };
  }
};

// Update user (Admin only)
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/api/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update user' };
  }
};

// Update user role  (CHANGE THIS ENDPOINT IF YOUR BACKEND DIFFERS)
export const updateUserRole = async (userId, roleId) => {
  const res = await api.patch(`/api/users/${userId}`, { role_id: roleId });
  return res.data;
};

// Delete user
export const deleteUser = async (userId) => {
  const res = await api.delete(`/api/users/${userId}`);
  return res.data;
};

// Undo delete = reactivate
export const reactivateUser = async (userId) => {
  const res = await api.post(`/api/users/${userId}/reactivate`);
  return res.data;
};