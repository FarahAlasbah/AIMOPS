// frontend/src/api/forecasts.js
import api from "./api";

export async function generateForecast({ productId, retrain = false } = {}) {
  const payload = {};
  if (productId != null) payload.product_id = Number(productId);
  if (retrain) payload.retrain = true;

  const res = await api.post("/api/forecasts/generate", payload);
  return res.data;
}

export async function getForecastStatuses() {
  const res = await api.get("/api/forecasts/status");
  return res.data;
}

export async function getForecastStatus(productId) {
  const id = encodeURIComponent(String(productId));
  const res = await api.get(`/api/forecasts/status/${id}`);
  return res.data;
}

export async function getProductForecast(productId, { days = 30 } = {}) {
  const id = encodeURIComponent(String(productId));
  const safeDays = Math.max(1, Math.min(90, Number(days) || 30));
  const res = await api.get(`/api/forecasts/${id}?days=${safeDays}`);
  return res.data;
}

export async function getForecastSummary({ days = 30 } = {}) {
  const safeDays = Math.max(1, Math.min(90, Number(days) || 30));
  const res = await api.get(`/api/forecasts?days=${safeDays}`);
  return res.data;
}