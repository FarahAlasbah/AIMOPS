import i18n from "../../../i18n";

const tCampaigns = (key, options = {}) =>
  i18n.t(key, {
    ns: "campaigns",
    ...options,
  });

const getLocale = () => i18n.language || "en-US";

const hasValue = (value) =>
  value !== "" && value !== null && value !== undefined;

const normalizeChannelsForPayload = (channels = []) => {
  return channels.filter(
    (channel) => channel && channel !== "google_ads",
  );
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));
};

export const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  return `${new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 1,
  }).format(Number(value))}%`;
};

export const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  return new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 1,
  }).format(Number(value));
};

export const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(getLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const normalizeProductsResponse = (response) => {
  const raw = Array.isArray(response?.products)
    ? response.products
    : Array.isArray(response)
      ? response
      : [];

  return raw
    .map((product) => ({
      id: product.product_id ?? product.id,
      name:
        product.product_name ??
        product.name ??
        tCampaigns("utils.unnamedProduct"),
      category: product.category ?? tCampaigns("utils.uncategorized"),
    }))
    .filter((item) => item.id);
};

export const normalizeCampaignResponse = (response) => {
  if (!response) return null;

  const campaign =
    response?.campaign && typeof response.campaign === "object"
      ? response.campaign
      : response;

  const insightSource =
    response?.insights || response?.analysis || response?.result || {};

  return {
    ...campaign,

    date_suggestions:
      campaign.date_suggestions ??
      response?.date_suggestions ??
      insightSource?.date_suggestions ??
      [],

    forecast_impact:
      campaign.forecast_impact ??
      response?.forecast_impact ??
      insightSource?.forecast_impact ??
      null,

    consultation:
      campaign.consultation ??
      response?.consultation ??
      insightSource?.consultation ??
      null,
  };
};

export const buildCampaignPayload = ({ formData, selectedProducts }) => {
  const notesParts = [];

  if (formData.notes.trim()) {
    notesParts.push(formData.notes.trim());
  }

  if (
    formData.campaignType === "other" &&
    formData.customCampaignTypeName.trim()
  ) {
    notesParts.push(
      `${tCampaigns("utils.customCampaignTypeName")}: ${formData.customCampaignTypeName.trim()}`,
    );
  }

  return {
    campaign_name: formData.campaignName.trim(),
    campaign_type: formData.campaignType,
    start_date: formData.startDate,
    end_date: formData.endDate,
    products: selectedProducts.map((product) => {
      const payload = {
        product_id: product.product_id,
      };

      if (hasValue(product.discount_pct)) {
        payload.discount_pct = Number(product.discount_pct);
      }

      if (hasValue(product.target_quantity)) {
        payload.target_quantity = Number(product.target_quantity);
      }

      return payload;
    }),
    channels: normalizeChannelsForPayload(formData.channels),
    budget: Number(formData.budget),
    notes: notesParts.join("\n\n"),
  };
};