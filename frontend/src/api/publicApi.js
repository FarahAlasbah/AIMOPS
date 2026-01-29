// frontend/src/api/publicApi.js
import axios from "axios";
import { API_BASE_URL } from "./config";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export default publicApi;
