import api from './api';

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};




// Logout user
// frontend/src/api/auth.js
export const logoutUser = async () => {
  // Most JWT systems don't need a backend logout endpoint
  return { success: true };
};


// Get current user info
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to get user info' };
  }
};