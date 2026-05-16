export const getEventId = (event) =>
  event?.event_id ??
  event?.id ??
  event?.eventId ??
  event?.confirmed_event_id ??
  event?.confirmedEventId;

export const getEventName = (event) =>
  event?.event_name ??
  event?.eventName ??
  event?.name ??
  event?.title ??
  "";

export const getEventStartDate = (event) =>
  event?.start_date ??
  event?.startDate ??
  event?.event_date ??
  event?.eventDate ??
  event?.date ??
  "";

export const getEventEndDate = (event) =>
  event?.end_date ?? event?.endDate ?? "";

const normalizeDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const getTodayKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const pickEventsArray = (response) => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.events)) return response.events;
  if (Array.isArray(response?.confirmed_events)) return response.confirmed_events;
  if (Array.isArray(response?.confirmedEvents)) return response.confirmedEvents;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;

  if (Array.isArray(response?.data?.events)) return response.data.events;

  if (Array.isArray(response?.data?.confirmed_events)) {
    return response.data.confirmed_events;
  }

  if (Array.isArray(response?.data?.confirmedEvents)) {
    return response.data.confirmedEvents;
  }

  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.results)) return response.data.results;

  if (Array.isArray(response?.events?.confirmed)) {
    return response.events.confirmed;
  }

  if (Array.isArray(response?.events?.confirmed_events)) {
    return response.events.confirmed_events;
  }

  return [];
};

const isDetectedOrDraftEvent = (event) => {
  const status = normalizeText(event?.status);
  const source = normalizeText(event?.source);
  const eventSource = normalizeText(event?.event_source);
  const type = normalizeText(event?.type);
  const eventType = normalizeText(event?.event_type);

  if (event?.is_draft === true || event?.isDraft === true) return true;
  if (event?.is_detected === true || event?.isDetected === true) return true;
  if (event?.draft === true || event?.detected === true) return true;

  return [
    status,
    source,
    eventSource,
    type,
    eventType,
  ].some((value) =>
    [
      "draft",
      "detected",
      "auto_detected",
      "auto-detected",
      "pending",
      "suggested",
      "dismissed",
    ].includes(value),
  );
};

const isConfirmedEvent = (event) => {
  if (isDetectedOrDraftEvent(event)) return false;

  const status = normalizeText(event?.status);

  if (!status) {
    return true;
  }

  return ["confirmed", "active", "completed"].includes(status);
};

const hasAlreadyEnded = (event) => {
  const todayKey = getTodayKey();

  const startDate = normalizeDate(getEventStartDate(event));
  const endDate = normalizeDate(getEventEndDate(event));

  const eventEndKey = endDate || startDate;

  if (!eventEndKey) return false;

  return eventEndKey < todayKey;
};

export const normalizeEventsResponse = (response) => {
  const rawEvents = pickEventsArray(response);

  return rawEvents
    .filter((event) => isConfirmedEvent(event))
    .filter((event) => hasAlreadyEnded(event))
    .map((event) => {
      const id = getEventId(event);
      const name = String(getEventName(event)).trim();

      if (!id || !name) return null;

      const startDate = normalizeDate(getEventStartDate(event));
      const endDate = normalizeDate(getEventEndDate(event));

      return {
        id,
        name,
        startDate,
        endDate,
        type: event.event_type ?? event.eventType ?? event.type ?? "",
        status: event.status ?? "confirmed",
        raw: event,
      };
    })
    .filter(Boolean);
};

export const formatEventOptionLabel = (event) => {
  const dateText =
    event.startDate && event.endDate
      ? `${event.startDate} → ${event.endDate}`
      : event.startDate || event.endDate || "";

  return dateText ? `${event.name} · ${dateText}` : event.name;
};