import api from "./api";

export async function getConsultationHistory() {
  const res = await api.get("/api/consultation/history");
  return res.data;
}

export async function sendConsultationMessage(message) {
  const res = await api.post("/api/consultation/chat", { message });
  return res.data;
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
