// frontend/src/features/dashboard/pages/overviewConstants.js

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

export const STATUS_ORDER = ["processed", "mapping", "pending", "failed", "unknown"];

export const STATUS_LABEL_KEY = {
  processed: "statusLabels.processed",
  mapping: "statusLabels.mapping",
  pending: "statusLabels.pending",
  failed: "statusLabels.failed",
  unknown: "statusLabels.unknown",
};

export const FORECAST_STATUS_ORDER = ["ready", "training", "failed", "idle"];

export const FORECAST_STATUS_LABEL_KEY = {
  ready: "forecastStatus.ready",
  training: "forecastStatus.training",
  failed: "forecastStatus.failed",
  idle: "forecastStatus.idle",
};

export const CAMPAIGN_STATUS_ORDER = ["active", "planned", "completed", "draft", "other"];

export const CAMPAIGN_STATUS_LABEL_KEY = {
  active: "campaignStatus.active",
  planned: "campaignStatus.planned",
  completed: "campaignStatus.completed",
  draft: "campaignStatus.draft",
  other: "campaignStatus.other",
};