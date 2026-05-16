import { CAMPAIGN_TYPES, CHANNEL_OPTIONS } from "./campaignConstants";

export const hasValue = (value) =>
  value !== "" && value !== null && value !== undefined;

export const normalizeText = (value) => String(value || "").trim();

export const toInputDate = (value) => {
  if (!value) return "";

  return String(value).slice(0, 10);
};

export const normalizeCampaignType = (value) => {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (CAMPAIGN_TYPES.includes(normalized)) {
    return normalized;
  }

  return "other";
};

export const getFirstValue = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];

    if (hasValue(value)) {
      return value;
    }
  }

  return undefined;
};

const getFirstValueFromSources = (sources, keys) => {
  for (const source of sources) {
    const value = getFirstValue(source, keys);

    if (hasValue(value)) {
      return value;
    }
  }

  return undefined;
};

export const extractSuggestion = (response) => {
  if (!response) return {};

  const root =
    response.data ||
    response.result ||
    response.suggestion ||
    response.campaign_suggestion ||
    response.suggested_campaign ||
    response.generated_campaign ||
    response.campaign ||
    response;

  const suggestions =
    root.suggestions ||
    root.campaign_suggestions ||
    root.suggested_campaigns ||
    root.generated_campaigns ||
    root.recommendations ||
    [];

  if (Array.isArray(suggestions) && suggestions.length) {
    const firstSuggestion = suggestions[0];

    return (
      firstSuggestion.campaign ||
      firstSuggestion.suggestion ||
      firstSuggestion.campaign_suggestion ||
      firstSuggestion.suggested_campaign ||
      firstSuggestion.generated_campaign ||
      firstSuggestion.recommendation ||
      firstSuggestion
    );
  }

  return (
    root.suggestion ||
    root.campaign_suggestion ||
    root.suggested_campaign ||
    root.generated_campaign ||
    root.recommendation ||
    root.recommended_campaign ||
    root.campaign ||
    root
  );
};

const getFirstDateSuggestion = (suggestion) => {
  if (Array.isArray(suggestion?.date_suggestions)) {
    return suggestion.date_suggestions[0] || {};
  }

  if (Array.isArray(suggestion?.recommended_dates)) {
    return suggestion.recommended_dates[0] || {};
  }

  return (
    suggestion?.recommended_dates ||
    suggestion?.date_range ||
    suggestion?.schedule ||
    suggestion?.dates ||
    {}
  );
};

export const normalizeSuggestedChannels = (
  suggestedChannels,
  fallbackChannels = [],
) => {
  const rawChannels = Array.isArray(suggestedChannels)
    ? suggestedChannels
    : typeof suggestedChannels === "string"
      ? suggestedChannels.split(",")
      : [];

  const normalized = rawChannels
    .map((channel) => {
      if (!channel) return "";

      const value =
        typeof channel === "object"
          ? channel.channel_name ||
            channel.channelName ||
            channel.name ||
            channel.value ||
            ""
          : channel;

      return normalizeText(value)
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
    })
    .filter((channel) => CHANNEL_OPTIONS.includes(channel));

  return normalized.length ? normalized : fallbackChannels;
};

export const normalizeSuggestedProducts = ({
  suggestion,
  availableProducts = [],
  fallbackProducts = [],
}) => {
  const lookupById = new Map(
    availableProducts.map((product) => [String(product.id), product]),
  );

  const lookupByName = new Map(
    availableProducts.map((product) => [
      normalizeText(product.name).toLowerCase(),
      product,
    ]),
  );

  const rawProducts =
    suggestion.products ||
    suggestion.campaign_products ||
    suggestion.recommended_products ||
    suggestion.suggested_products ||
    suggestion.selected_products ||
    suggestion.product_ids ||
    suggestion.recommended_product_ids ||
    suggestion.suggested_product_ids ||
    [];

  if (!Array.isArray(rawProducts) || !rawProducts.length) {
    return fallbackProducts;
  }

  const productMap = new Map();

  rawProducts.forEach((item) => {
    const rawProductId =
      typeof item === "object"
        ? item.product_id || item.productId || item.id
        : item;

    const rawProductName =
      typeof item === "object"
        ? item.product_name || item.productName || item.name || ""
        : "";

    const lookupProduct =
      lookupById.get(String(rawProductId)) ||
      lookupByName.get(normalizeText(rawProductName).toLowerCase());

    const productId = rawProductId || lookupProduct?.id;

    if (!productId) return;

    productMap.set(String(productId), {
      product_id: productId,
      product_name:
        typeof item === "object"
          ? item.product_name ||
            item.productName ||
            item.name ||
            lookupProduct?.name ||
            `Product #${productId}`
          : lookupProduct?.name || `Product #${productId}`,
      category:
        typeof item === "object"
          ? item.category || lookupProduct?.category || ""
          : lookupProduct?.category || "",
      target_quantity:
        typeof item === "object"
          ? item.target_quantity || item.targetQuantity || ""
          : "",
      discount_pct:
        typeof item === "object"
          ? item.discount_pct ||
            item.discountPct ||
            item.discount_percentage ||
            item.discountPercentage ||
            ""
          : "",
    });
  });

  return productMap.size ? Array.from(productMap.values()) : fallbackProducts;
};

export const buildSuggestionNotes = (suggestion = {}) => {
  const recommendations = Array.isArray(suggestion.recommendations)
    ? suggestion.recommendations.filter(Boolean).join("\n")
    : "";

  const notes = [
    suggestion.notes,
    suggestion.description,
    suggestion.reason,
    suggestion.explanation,
    suggestion.summary,
    suggestion.consultation?.advice,
    recommendations,
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return notes.join("\n\n");
};

export const didSuggestionApplyAnything = ({
  previousFormData,
  nextFormData,
  previousProducts,
  nextProducts,
}) => {
  return (
    previousFormData.campaignName !== nextFormData.campaignName ||
    previousFormData.campaignType !== nextFormData.campaignType ||
    previousFormData.customCampaignTypeName !==
      nextFormData.customCampaignTypeName ||
    previousFormData.startDate !== nextFormData.startDate ||
    previousFormData.endDate !== nextFormData.endDate ||
    String(previousFormData.budget) !== String(nextFormData.budget) ||
    previousFormData.notes !== nextFormData.notes ||
    previousFormData.channels.join("|") !== nextFormData.channels.join("|") ||
    previousProducts.length !== nextProducts.length
  );
};

export const buildAppliedSuggestionData = ({
  response,
  formData,
  selectedProducts,
  availableProducts,
}) => {
  const suggestion = extractSuggestion(response);
  const firstDateSuggestion = getFirstDateSuggestion(suggestion);

  const generatedType = getFirstValue(suggestion, [
    "campaign_type",
    "campaignType",
    "type",
    "suggested_type",
    "suggestedType",
  ]);

  const campaignType = generatedType
    ? normalizeCampaignType(generatedType)
    : formData.campaignType;

  const campaignName = getFirstValue(suggestion, [
    "campaign_name",
    "campaignName",
    "name",
    "title",
    "suggested_name",
    "suggestedName",
  ]);

  const startDateValue = getFirstValueFromSources(
    [suggestion, firstDateSuggestion],
    [
      "start_date",
      "startDate",
      "recommended_start_date",
      "recommendedStartDate",
      "suggested_start_date",
      "suggestedStartDate",
    ],
  );

  const endDateValue = getFirstValueFromSources(
    [suggestion, firstDateSuggestion],
    [
      "end_date",
      "endDate",
      "recommended_end_date",
      "recommendedEndDate",
      "suggested_end_date",
      "suggestedEndDate",
    ],
  );

  const budgetValue = getFirstValue(suggestion, [
    "budget",
    "estimated_budget",
    "estimatedBudget",
    "recommended_budget",
    "recommendedBudget",
    "suggested_budget",
    "suggestedBudget",
  ]);

  const notes = buildSuggestionNotes(suggestion);

  const nextProducts = normalizeSuggestedProducts({
    suggestion,
    availableProducts,
    fallbackProducts: selectedProducts,
  });

  const nextFormData = {
    ...formData,
    campaignName: normalizeText(campaignName) || formData.campaignName,
    campaignType,
    customCampaignTypeName:
      campaignType === "other" && generatedType
        ? normalizeText(generatedType)
        : campaignType === "other"
          ? formData.customCampaignTypeName
          : "",
    startDate: toInputDate(startDateValue) || formData.startDate,
    endDate: toInputDate(endDateValue) || formData.endDate,
    budget: hasValue(budgetValue) ? budgetValue : formData.budget,
    notes: notes || formData.notes,
    channels: normalizeSuggestedChannels(suggestion.channels, formData.channels),
  };

  const changed = didSuggestionApplyAnything({
    previousFormData: formData,
    nextFormData,
    previousProducts: selectedProducts,
    nextProducts,
  });

  return {
    suggestion,
    nextFormData,
    nextProducts,
    changed,
  };
};