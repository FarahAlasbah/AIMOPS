import axios from "axios";
import { API_BASE_URL } from "./config";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});
const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  setUser(null);
  setIsAuthenticated(false);
  navigate('/login');
};

export default publicApi;
