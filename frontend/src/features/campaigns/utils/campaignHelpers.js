export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));
};

export const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(Number(value))}%`;
};

export const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(Number(value));
};

export const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
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
      name: product.product_name ?? product.name ?? "Unnamed Product",
      category: product.category ?? "Uncategorized",
    }))
    .filter((item) => item.id);
};

export const normalizeCampaignResponse = (response) => {
  if (response?.campaign) return response.campaign;
  return response;
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
      `Custom campaign type name: ${formData.customCampaignTypeName.trim()}`
    );
  }

  return {
    campaign_name: formData.campaignName.trim(),
    campaign_type: formData.campaignType,
    start_date: formData.startDate,
    end_date: formData.endDate,
    products: selectedProducts.map((product) => ({
      product_id: product.product_id,
      discount_pct:
        product.discount_pct === "" ? 0 : Number(product.discount_pct),
      target_quantity: Number(product.target_quantity),
    })),
    channels: formData.channels,
    budget: Number(formData.budget),
    notes: notesParts.join("\n\n"),
  };
};