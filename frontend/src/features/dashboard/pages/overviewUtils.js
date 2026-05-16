// frontend/src/features/dashboard/pages/overviewUtils.js

export function pickDashboard({ user, hasPermission }) {
  const roleName = user?.role?.display_name || user?.role_name || "";

  if (user?.is_admin === true || roleName === "Administrator") return "admin";
  if (roleName === "Business Owner") return "owner";
  if (roleName === "Marketing User") return "marketing";

  if (hasPermission?.("users.view") || hasPermission?.("system.settings")) return "admin";
  if (hasPermission?.("campaigns.view") || hasPermission?.("feedback.view")) return "marketing";

  return "default";
}

export function toNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  const cleaned = typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeUploadStatus(value) {
  const v = String(value || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "confirmed", "imported"].includes(v)) return "processed";
  if (["mapping", "needs_mapping", "needs mapping"].includes(v)) return "mapping";
  if (["pending", "uploaded", "processing"].includes(v)) return "pending";
  if (["failed", "error", "rejected"].includes(v)) return "failed";

  return "unknown";
}

export function normalizeCampaignStatus(value) {
  const v = String(value || "").trim().toLowerCase().replaceAll("_", "-");

  if (["active", "running", "ongoing", "in-progress"].includes(v)) return "active";
  if (["planned", "scheduled", "upcoming"].includes(v)) return "planned";
  if (["completed", "done", "finished"].includes(v)) return "completed";
  if (["draft", "pending"].includes(v)) return "draft";

  return "other";
}

export function formatNumber(value, locale = "en") {
  const number = toNumber(value, NaN);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(number);
}

export function formatCompactNumber(value, locale = "en") {
  const number = toNumber(value, NaN);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

export function formatCurrency(value, locale = "en") {
  const number = toNumber(value, 0);
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatPercent(value, locale = "en") {
  const number = toNumber(value, NaN);
  if (!Number.isFinite(number)) return "—";
  return `${new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    maximumFractionDigits: 1,
  }).format(number)}%`;
}

export function formatDateTime(value, locale = "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shortDayLabel(value, locale = "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return date.toLocaleDateString(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
  });
}

export function getProductName(product, fallback) {
  return product?.product_name || product?.name || fallback;
}

export function getProductRevenue(product) {
  return toNumber(
    product?.total_revenue ?? product?.stats?.total_revenue ?? product?.revenue,
    0,
  );
}

export function getCampaignName(campaign, fallback) {
  return campaign?.campaign_name || campaign?.name || campaign?.title || fallback;
}

export function getCampaignBudget(campaign) {
  return toNumber(campaign?.budget ?? campaign?.total_budget, 0);
}

export function getCampaignRevenue(campaign) {
  return toNumber(
    campaign?.forecast_additional_revenue ??
      campaign?.additional_revenue ??
      campaign?.expected_revenue ??
      campaign?.predicted_revenue ??
      campaign?.revenue ??
      campaign?.total_revenue,
    0,
  );
}

export function getCampaignRoi(campaign) {
  return toNumber(
    campaign?.predicted_roi ??
      campaign?.estimated_roi ??
      campaign?.roi ??
      campaign?.expected_roi,
    0,
  );
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}