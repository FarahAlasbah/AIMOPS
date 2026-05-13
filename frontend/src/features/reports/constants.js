export const ALL_TIME_START_DATE = "2024-01-01";

export const PERIOD_OPTIONS = [
  { value: "30", labelKey: "periodOptions.last30" },
  { value: "90", labelKey: "periodOptions.last90" },
  { value: "180", labelKey: "periodOptions.last180" },
  { value: "365", labelKey: "periodOptions.lastYear" },
  { value: "all", labelKey: "periodOptions.allTime" },
];

export const FORECAST_STATUS_ORDER = ["ready", "training", "failed", "idle"];

export const UPLOAD_STATUS_ORDER = ["processed", "mapping", "pending", "failed"];

export const ACTIVE_CAMPAIGN_STATUSES = new Set([
  "active",
  "running",
  "ongoing",
  "in-progress",
  "in_progress",
]);

export const CHART_COLORS = {
  navy: "#03045e",
  blue: "#2563eb",
  indigo: "#4f46e5",
  violet: "#7c3aed",
  emerald: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  slate: "#64748b",
};