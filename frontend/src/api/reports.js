import api from "./api";

export async function getDashboardReport({ startDate, endDate } = {}) {
  const params = new URLSearchParams();

  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const query = params.toString();
  const res = await api.get(`/api/reports/dashboard${query ? `?${query}` : ""}`);

  return res.data;
}