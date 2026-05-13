// frontend/src/api/reports.js
import api from "./api";

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultReportRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  return {
    startDate: "2024-01-01",
    endDate: toDateInputValue(end),
  };
}

export async function getDashboardReport({ startDate, endDate } = {}) {
  const defaultRange = getDefaultReportRange();

  const safeStartDate = startDate || defaultRange.startDate;
  const safeEndDate = endDate || defaultRange.endDate;

  const params = new URLSearchParams();
  params.set("start_date", safeStartDate);
  params.set("end_date", safeEndDate);

  const res = await api.get(`/api/reports/dashboard?${params.toString()}`);

  return res.data;
}