import api from "./api";

function getAuthToken() {
  return (
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function buildApiUrl(path) {
  const baseURL = String(api?.defaults?.baseURL || "").replace(/\/$/, "");
  return `${baseURL}${path}`;
}

function createFetchError({ status, message }) {
  const error = new Error(message || "Request failed.");

  error.response = {
    status,
    data: {
      message: message || "Request failed.",
      detail: message || "Request failed.",
    },
  };

  return error;
}

async function getErrorMessageFromResponse(response) {
  try {
    const data = await response.clone().json();

    if (typeof data?.message === "string") return data.message;
    if (typeof data?.detail === "string") return data.detail;

    return JSON.stringify(data);
  } catch {
    try {
      const text = await response.text();
      return text || `Request failed with status ${response.status}.`;
    } catch {
      return `Request failed with status ${response.status}.`;
    }
  }
}

function extractTextFromJsonPayload(payload) {
  if (!payload || typeof payload !== "object") return "";

  if (typeof payload.token === "string") return payload.token;
  if (typeof payload.chunk === "string") return payload.chunk;
  if (typeof payload.delta === "string") return payload.delta;
  if (typeof payload.content === "string") return payload.content;
  if (typeof payload.text === "string") return payload.text;
  if (typeof payload.response === "string") return payload.response;
  if (typeof payload.message === "string") return payload.message;

  const choiceDelta = payload?.choices?.[0]?.delta?.content;
  if (typeof choiceDelta === "string") return choiceDelta;

  const choiceText = payload?.choices?.[0]?.text;
  if (typeof choiceText === "string") return choiceText;

  return "";
}

function parseServerSentLine(line) {
  const trimmedLine = String(line || "").trim();

  if (!trimmedLine) return "";
  if (trimmedLine.startsWith(":")) return "";

  const rawPayload = trimmedLine.startsWith("data:")
    ? trimmedLine.slice(5).trim()
    : trimmedLine;

  if (!rawPayload || rawPayload === "[DONE]") return "";

  try {
    const parsed = JSON.parse(rawPayload);
    return extractTextFromJsonPayload(parsed);
  } catch {
    return rawPayload;
  }
}

export async function getConsultationHistory() {
  const res = await api.get("/api/consultation/history");
  return res.data;
}

export async function sendConsultationMessage(message) {
  const res = await api.post("/api/consultation/chat", { message });
  return res.data;
}

export async function sendConsultationMessageStream(
  message,
  { onChunk, signal } = {},
) {
  const token = getAuthToken();

  const response = await fetch(
    buildApiUrl("/api/consultation/chat/stream"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, text/plain, application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ message }),
      signal,
    },
  );

  if (!response.ok) {
    const messageText = await getErrorMessageFromResponse(response);

    throw createFetchError({
      status: response.status,
      message: messageText,
    });
  }

  if (!response.body) {
    const data = await response.json().catch(() => null);
    const fallbackText = extractTextFromJsonPayload(data);

    if (fallbackText) {
      onChunk?.(fallbackText);
    }

    return {
      success: true,
      response: fallbackText,
    };
  }

  const contentType = response.headers.get("content-type") || "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let fullText = "";
  let pendingLine = "";
  let streamMode = contentType.includes("text/event-stream")
    ? "sse"
    : contentType.includes("ndjson") ||
        contentType.includes("jsonlines")
      ? "lines"
      : "unknown";

  const pushChunk = (chunk) => {
    if (!chunk) return;

    fullText += chunk;
    onChunk?.(chunk);
  };

  const processLineBasedChunk = (rawChunk, isFinal = false) => {
    pendingLine += rawChunk;

    const lines = pendingLine.split(/\r?\n/);
    pendingLine = isFinal ? "" : lines.pop() || "";

    lines.forEach((line) => {
      if (!line.trim()) return;

      if (streamMode === "sse") {
        pushChunk(parseServerSentLine(line));
        return;
      }

      try {
        const parsed = JSON.parse(line);
        pushChunk(extractTextFromJsonPayload(parsed));
      } catch {
        pushChunk(line);
      }
    });

    if (isFinal && pendingLine.trim()) {
      if (streamMode === "sse") {
        pushChunk(parseServerSentLine(pendingLine));
      } else {
        try {
          const parsed = JSON.parse(pendingLine);
          pushChunk(extractTextFromJsonPayload(parsed));
        } catch {
          pushChunk(pendingLine);
        }
      }

      pendingLine = "";
    }
  };

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      if (streamMode === "sse" || streamMode === "lines") {
        processLineBasedChunk("", true);
      }

      break;
    }

    const decodedChunk = decoder.decode(value, { stream: true });

    if (!decodedChunk) continue;

    if (streamMode === "unknown") {
      const trimmedChunk = decodedChunk.trimStart();

      if (trimmedChunk.startsWith("data:")) {
        streamMode = "sse";
      } else if (
        trimmedChunk.startsWith("{") &&
        (decodedChunk.includes("\n") || decodedChunk.includes("\r"))
      ) {
        streamMode = "lines";
      } else {
        streamMode = "plain";
      }
    }

    if (streamMode === "sse" || streamMode === "lines") {
      processLineBasedChunk(decodedChunk);
    } else {
      pushChunk(decodedChunk);
    }
  }

  return {
    success: true,
    response: fullText,
  };
}

export async function createConsultationSummary(title) {
  const res = await api.post("/api/consultation/summaries", { title });
  return res.data;
}

export async function getConsultationSummaries() {
  const res = await api.get("/api/consultation/summaries");
  return res.data;
}

export async function deleteConsultationSummary(summaryId) {
  const id = encodeURIComponent(String(summaryId));
  const res = await api.delete(`/api/consultation/summaries/${id}`);
  return res.data;
}

export async function clearConsultationHistory() {
  const res = await api.delete("/api/consultation/history/clear");
  return res.data;
}