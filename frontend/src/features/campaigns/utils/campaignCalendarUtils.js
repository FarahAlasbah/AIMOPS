export const getCampaignId = (campaign) =>
  campaign?.campaign_id ?? campaign?.id ?? campaign?.campaignId;

export const getCampaignStartDate = (campaign) =>
  campaign?.start_date ?? campaign?.startDate ?? campaign?.date_start;

export const getCampaignEndDate = (campaign) =>
  campaign?.end_date ?? campaign?.endDate ?? campaign?.date_end;

export const toDateKey = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const overlapsRange = (campaign, startDate, endDate) => {
  const campaignStart = toDateKey(getCampaignStartDate(campaign));
  const campaignEnd = toDateKey(getCampaignEndDate(campaign)) || campaignStart;

  if (!campaignStart || !startDate || !endDate) return false;

  return campaignStart <= endDate && campaignEnd >= startDate;
};

export const normalizeCampaignList = (response) => {
  if (Array.isArray(response?.campaigns)) return response.campaigns;
  if (Array.isArray(response)) return response;
  return [];
};

export const mergeCampaigns = (...lists) => {
  const map = new Map();

  lists.flat().forEach((campaign) => {
    const id = getCampaignId(campaign);
    if (!id) return;

    map.set(String(id), {
      ...map.get(String(id)),
      ...campaign,
    });
  });

  return Array.from(map.values());
};

export const groupCampaignsByStartDate = (campaigns) => {
  const map = new Map();

  campaigns.forEach((campaign) => {
    const key = toDateKey(getCampaignStartDate(campaign)) || "unknown";

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(campaign);
  });

  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
};