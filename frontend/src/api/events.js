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
 * UPDATE event — tries PUT first, falls back to PATCH if 405.
 */
export async function updateEvent(eventId, payload) {
  const id = encodeURIComponent(String(eventId));
  try {
    const res = await api.put(`/api/events/${id}`, payload);
    return res.data;
  } catch (err) {
    if (err?.response?.status === 405) {
      const res = await api.patch(`/api/events/${id}`, payload);
      return res.data;
    }
    throw err;
  }
}

// ── Draft events ─────────────────────────────────────────────────────────────

/**
 * GET /api/events/drafts
 * Returns list of auto-detected draft events awaiting user review.
 */
export async function getDraftEvents() {
  const res = await api.get("/api/events/drafts");
  return res.data;
}

/**
 * POST /api/events/drafts/{id}/confirm
 * Confirms a draft event with a user-supplied name + metadata.
 */
export async function confirmDraftEvent(eventId, payload) {
  const id = encodeURIComponent(String(eventId));
  const res = await api.post(`/api/events/drafts/${id}/confirm`, payload);
  return res.data;
}

/**
 * POST /api/events/drafts/{id}/dismiss
 * Dismisses a draft event — it won't affect forecasts.
 */


export async function dismissDraftEvent(id) {
  const { data } = await api.post(`/api/events/drafts/${id}/dismiss`, {});
  return data;
}