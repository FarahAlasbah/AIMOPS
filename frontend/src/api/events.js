// frontend/src/api/events.js
import api from "./api";

export async function getEvents({ upcoming = false } = {}) {
  const res = await api.get(`/api/events?upcoming=${upcoming ? "true" : "false"}`);
  return res.data;
}

export async function getEventById(eventId) {
  const id = encodeURIComponent(String(eventId));
  const res = await api.get(`/api/events/${id}`);
  return res.data;
}

export async function createEvent(payload) {
  const res = await api.post("/api/events", payload);
  return res.data;
}

export async function analyzeEvent(eventId, payload) {
  const id = encodeURIComponent(String(eventId));
  const res = await api.post(`/api/events/${id}/analyze`, payload);
  return res.data;
}

/**
 * UPDATE event
 * Tries PUT first, and if backend only supports PATCH it falls back automatically.
 */
export async function updateEvent(eventId, payload) {
  const id = encodeURIComponent(String(eventId));

  try {
    const res = await api.put(`/api/events/${id}`, payload);
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 405) {
      const res = await api.patch(`/api/events/${id}`, payload);
      return res.data;
    }
    throw err;
  }
}