let localSequence = 0;

function nextLocalId(prefix) {
  localSequence += 1;
  return `${prefix}-${Date.now()}-${localSequence}`;
}

function normalizeRole(item) {
  const role = String(item?.role ?? item?.sender ?? item?.type ?? "").toLowerCase();

  if (["user", "human", "customer", "client"].includes(role)) {
    return "user";
  }

  return "assistant";
}

export function mapHistoryResponseToMessages(data) {
  const rawMessages = Array.isArray(data?.messages) ? data.messages : [];

  return rawMessages.map((item, index) => ({
    id: String(item?.id ?? item?.message_id ?? item?.created_at ?? item?.timestamp ?? index),
    role: normalizeRole(item),
    content: String(item?.content ?? item?.message ?? item?.text ?? item?.response ?? ""),
    createdAt: item?.created_at ?? item?.timestamp ?? null,
    status: "sent",
  }));
}

export function mapSummariesResponse(data) {
  return Array.isArray(data?.summaries) ? data.summaries : [];
}

export function createLocalUserMessage(content) {
  return {
    id: nextLocalId("consultation-user"),
    role: "user",
    content,
    createdAt: new Date().toISOString(),
    status: "sent",
  };
}

export function createLocalAssistantLoadingMessage() {
  return {
    id: nextLocalId("consultation-loading"),
    role: "assistant",
    content: "",
    createdAt: new Date().toISOString(),
    status: "loading",
  };
}

export function createLocalAssistantMessage(content) {
  return {
    id: nextLocalId("consultation-assistant"),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    status: "sent",
  };
}
