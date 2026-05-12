// frontend/src/api/auditLogs.js
import api from "./api";

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function extractLogs(data) {
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.logs,
    data?.items,
    data?.results,
    data?.data,
    data?.audit_logs,
    data?.auditLogs,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

export async function getAuditLogs({
  action = "",
  performedById = "",
  targetUserId = "",
  limit = 50,
  offset = 0,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const params = new URLSearchParams();
  params.set("limit", String(safeLimit));
  params.set("offset", String(safeOffset));

  if (String(action).trim()) {
    params.set("action", String(action).trim());
  }

  if (String(performedById).trim()) {
    params.set("performed_by_id", String(performedById).trim());
  }

  if (String(targetUserId).trim()) {
    params.set("target_user_id", String(targetUserId).trim());
  }

  const res = await api.get(`/api/audit-logs?${params.toString()}`);
  const data = res.data;

  const logs = extractLogs(data);

  return {
    success: data?.success ?? true,
    total: toNumber(data?.total, logs.length),
    offset: toNumber(data?.offset, safeOffset),
    limit: toNumber(data?.limit, safeLimit),
    logs,
  };
}