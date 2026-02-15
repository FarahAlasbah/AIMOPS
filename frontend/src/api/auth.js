// frontend/src/api/auth.js
import api from "./api";

export const loginUser = async (credentials) => {
  const response = await api.post("/api/auth/login", credentials);
  return response.data;
};

export const logoutUser = async () => {
  return { success: true };
};

export const getCurrentUser = async () => {
  const response = await api.get("/api/auth/me");
  return response.data;
};
