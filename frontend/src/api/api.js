// frontend/src/api/api.js
import axios from "axios";
import { API_BASE_URL } from "./config";

const TOKEN_KEYS = ["auth_token", "access_token", "token"];

export const getStoredToken = () => {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }

  return "";
};

export const clearStoredTokens = () => {
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredTokens();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;