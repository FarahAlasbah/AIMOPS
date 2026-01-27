import axios from "axios";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Example: Get all campaigns
export const getCampaigns = async () => {
  const response = await api.get("/campaigns"); // backend route
  return response.data;
};

// Example: Login
export const loginUser = async (data) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

export default api;
