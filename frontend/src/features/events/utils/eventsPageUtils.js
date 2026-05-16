export const TAB_DETECTED = "detected";
export const TAB_CONFIRMED = "confirmed";

export const normalizeId = (id) => String(id ?? "").trim();

export const isConfirmedEvent = (event) => {
  const status = String(event?.status || "").trim().toLowerCase();
  return status === "confirmed";
};

export const extractApiError = (err, fallback) => {
  const data = err?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  if (typeof err?.message === "string") return err.message;

  if (data?.detail && typeof data.detail === "object") {
    if (typeof data.detail.message === "string") return data.detail.message;

    try {
      return JSON.stringify(data.detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export const getEventTitle = (event, t) => {
  return (
    event?.event_name ||
    event?.event_name_ar ||
    event?.title ||
    event?.name ||
    t("eventsPage.eventFallbackName", {
      id: event?.event_id ?? "",
    })
  );
};

const DRAFT_IMPACT_META = {
  very_high: { labelKey: "impact.levels.very_high", cls: "dimp-veryhigh" },
  high: { labelKey: "impact.levels.high", cls: "dimp-high" },
  medium: { labelKey: "impact.levels.medium", cls: "dimp-medium" },
  low: { labelKey: "impact.levels.low", cls: "dimp-low" },
};

export const getDraftImpactMeta = (level, t) => {
  const key = String(level || "").toLowerCase();
  const meta = DRAFT_IMPACT_META[key];

  if (!meta) {
    return {
      label: level || "—",
      cls: "dimp-low",
    };
  }

  return {
    label: t(meta.labelKey),
    cls: meta.cls,
  };
};