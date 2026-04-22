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

export async function getForecastExplanation(productId, { allowMissing = false } = {}) {
  const id = encodeURIComponent(String(productId));

  try {
    const res = await api.get(`/api/forecasts/${id}/explanation`);
    return res.data;
  } catch (error) {
    if (allowMissing && error?.response?.status === 404) {
      return null;
    }

    throw error;
  }
}


/*
  Ideal endpoint for the UX you want.
  If backend does not support POST yet, keep this function here and add the endpoint next.
*/
export async function createForecastExplanation(productId, payload = {}) {
  const id = encodeURIComponent(String(productId));
  const res = await api.post(`/api/forecasts/${id}/explanation`, payload);
  return res.data;
}

export async function deleteForecastExplanation(productId) {
  const id = encodeURIComponent(String(productId));
  const res = await api.delete(`/api/forecasts/${id}/explanation`);
  return res.data;
}

