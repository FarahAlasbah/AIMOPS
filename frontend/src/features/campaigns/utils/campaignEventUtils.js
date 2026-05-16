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

  if (Array.isArray(response?.events?.confirmed)) return response.events.confirmed;
  if (Array.isArray(response?.events?.confirmed_events)) {
    return response.events.confirmed_events;
  }

  return [];
};

export const normalizeEventsResponse = (response) => {
  const rawEvents = pickEventsArray(response);

  return rawEvents
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
        status: event.status ?? "",
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