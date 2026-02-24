// frontend/src/api/notifications.js
import api from "./api";

// Event reminders
export async function getUpcomingReminders() {
  const res = await api.get("/api/events/reminders/upcoming");
  return res.data;
}

// Best-effort inbox fetch (because you didn’t provide the GET endpoint)
// Tries a few common paths so UI still works without crashing.
export async function getMyNotifications() {
  const candidates = ["/api/notifications", "/api/notifications/me", "/api/notifications/inbox"];

  for (const path of candidates) {
    try {
      const res = await api.get(path);
      const data = res.data;

      // Accept common shapes:
      // - array
      // - { notifications: [...] }
      // - { items/results/data: [...] }
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.notifications)) return data.notifications;

      const maybe = data?.items || data?.results || data?.data;
      if (Array.isArray(maybe)) return maybe;
    } catch (err) {
      const status = err?.response?.status;
      // If endpoint doesn’t exist, try the next candidate
      if (status === 404 || status === 405) continue;
      // For other errors (401 handled by interceptor), fail softly
      return [];
    }
  }

  return [];
}

// Admin: send to one user
export async function sendNotificationToUser(payload) {
  const res = await api.post("/api/notifications", payload);
  return res.data;
}

// Admin: broadcast
export async function broadcastNotification(payload) {
  const res = await api.post("/api/notifications/broadcast", payload);
  return res.data;
}