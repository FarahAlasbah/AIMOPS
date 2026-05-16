export const CAMPAIGN_TYPES = [
  "discount",
  "bundle",
  "flash_sale",
  "seasonal",
  "loyalty",
  "other",
];

export const CHANNEL_OPTIONS = [
  "facebook",
  "instagram",
  "email",
  "sms",
  "in_store",
];

export const STATUS_FILTERS = ["all", "planned", "active", "completed"];

export const DEFAULT_FORM_DATA = {
  campaignName: "",
  campaignType: "discount",
  customCampaignTypeName: "",
  startDate: "",
  endDate: "",
  budget: 0,
  notes: "",
  channels: [],
};

export const getDefaultCalendarRange = () => {
  const now = new Date();
  const year = now.getFullYear();

  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
};