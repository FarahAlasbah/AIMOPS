import api from "./api";

export async function getCampaigns() {
  const res = await api.get("/api/campaigns");
  return res.data;
}

export async function getCampaignById(campaignId) {
  const id = encodeURIComponent(String(campaignId));
  const res = await api.get(`/api/campaigns/${id}`);
  return res.data;
}

export async function createCampaign(payload) {
  const res = await api.post("/api/campaigns", payload);
  return res.data;
}

export async function publishCampaign(campaignId) {
  const id = encodeURIComponent(String(campaignId));
  const res = await api.patch(`/api/campaigns/${id}`, { status: "active" });
  return res.data;
}

export async function deleteCampaign(campaignId) {
  const id = encodeURIComponent(String(campaignId));
  const res = await api.delete(`/api/campaigns/${id}`);
  return res.data;
}

export async function getCampaignCalendar({ startDate, endDate }) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  const res = await api.get(`/api/campaigns/calendar?${params.toString()}`);
  return res.data;
}