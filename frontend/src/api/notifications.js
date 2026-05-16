import api from "./api";

// Event reminders
export async function getUpcomingReminders() {
  const res = await api.get("/api/events/reminders/upcoming");
  return res.data;
}

// Inbox notifications
export async function getMyNotifications() {
  const candidates = [
    "/api/notifications",
    "/api/notifications/me",
    "/api/notifications/inbox",
  ];

  for (const path of candidates) {
    try {
      const res = await api.get(path, {
        params: {
          unread_only: false,
          limit: 100,
        },
      });

      const data = res.data;

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.notifications)) return data.notifications;

      const maybe = data?.items || data?.results || data?.data;
      if (Array.isArray(maybe)) return maybe;
    } catch (err) {
      const status = err?.response?.status;

      if (status === 404 || status === 405) continue;

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

// Mark one backend notification as read
export async function markNotificationRead(notificationId) {
  const id = encodeURIComponent(String(notificationId));
  const res = await api.put(`/api/notifications/${id}/read`);
  return res.data;
}

// Mark all backend notifications as read
export async function markAllNotificationsRead() {
  const res = await api.put("/api/notifications/read-all");
  return res.data;
}

// Delete one backend notification
export async function deleteNotification(notificationId) {
  const id = encodeURIComponent(String(notificationId));
  const res = await api.delete(`/api/notifications/${id}`);
  return res.data;
}