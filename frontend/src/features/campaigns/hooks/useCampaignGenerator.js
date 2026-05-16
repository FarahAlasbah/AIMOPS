import { useCallback, useState } from "react";

import { generateCampaignSuggestion } from "../../../api/campaigns";
import { getEvents } from "../../../api/events";
import { buildGeneratePayload } from "../utils/campaignGeneratorPayload";
import { normalizeEventsResponse } from "../utils/campaignEventUtils";
import { buildAppliedSuggestionData } from "../utils/campaignSuggestionUtils";

const getProductSignature = (products = []) =>
  products
    .map(
      (product) =>
        `${product.product_id}:${product.target_quantity}:${product.discount_pct}`,
    )
    .sort()
    .join("|");

const buildGeneratedFieldMarkers = ({
  formData,
  selectedProducts,
  nextFormData,
  nextProducts,
}) => {
  const markers = {};

  [
    "campaignName",
    "campaignType",
    "customCampaignTypeName",
    "startDate",
    "endDate",
    "budget",
    "notes",
  ].forEach((field) => {
    if (String(formData[field] ?? "") !== String(nextFormData[field] ?? "")) {
      markers[field] = true;
    }
  });

  if (formData.channels.join("|") !== nextFormData.channels.join("|")) {
    markers.channels = true;
  }

  if (getProductSignature(selectedProducts) !== getProductSignature(nextProducts)) {
    markers.products = true;
  }

  return markers;
};

export function useCampaignGenerator({
  t,
  formData,
  setFormData,
  availableProducts,
  selectedProducts,
  setSelectedProducts,
  setErrors,
  setCreatedResult,
  setPageError,
  setSuccessMessage,
  setGeneratedFields,
}) {
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState("");

  const [campaignEvents, setCampaignEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const loadCampaignEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError("");

    try {
      const response = await getEvents({ upcoming: false });
      const normalized = normalizeEventsResponse(response);

      console.log("Campaign generator events response:", response);
      console.log("Normalized campaign events:", normalized);

      setCampaignEvents(normalized);
    } catch (error) {
      setCampaignEvents([]);
      setEventsError(
        error.message ||
          t("generator.event.loadError", {
            defaultValue: "Could not load events.",
          }),
      );
    } finally {
      setEventsLoading(false);
    }
  }, [t]);

  const openGeneratorModal = () => {
    setGeneratorError("");
    setGeneratorModalOpen(true);
    loadCampaignEvents();
  };

  const closeGeneratorModal = () => {
    if (generatorLoading) return;

    setGeneratorError("");
    setGeneratorModalOpen(false);
  };

  const handleGenerateSuggestion = async (options) => {
    setGeneratorError("");
    setPageError("");
    setSuccessMessage("");

    let result;

    try {
      result = buildGeneratePayload({
        ...options,
        formData,
        selectedProducts,
        t,
      });
    } catch (error) {
      setGeneratorError(error.message);
      return;
    }

    setGeneratorLoading(true);

    try {
      const response = await generateCampaignSuggestion(result.payload);

      console.log("Campaign suggestion response:", response);

      const { suggestion, nextFormData, nextProducts, changed } =
        buildAppliedSuggestionData({
          response,
          formData,
          selectedProducts,
          availableProducts,
        });

      console.log("Extracted campaign suggestion:", suggestion);

      if (!changed) {
        throw new Error(
          t("messages.generatorNoUsableData", {
            defaultValue:
              "AIMOPS received suggestions, but the response fields do not match the campaign form yet. Open the console and check the extracted suggestion.",
          }),
        );
      }

      setFormData(nextFormData);

      if (nextProducts.length) {
        setSelectedProducts(nextProducts);
      }

      setGeneratedFields?.(
        buildGeneratedFieldMarkers({
          formData,
          selectedProducts,
          nextFormData,
          nextProducts,
        }),
      );

      setErrors({});
      setCreatedResult(null);
      setGeneratorModalOpen(false);

      setSuccessMessage(
        t("messages.generatorApplied", {
          defaultValue:
            "The suggestion is ready. Fields filled by AIMOPS are highlighted so you can review them before saving.",
        }),
      );
    } catch (error) {
      setGeneratorError(
        error.message ||
          t("messages.generatorError", {
            defaultValue: "Could not generate a campaign suggestion.",
          }),
      );
    } finally {
      setGeneratorLoading(false);
    }
  };

  return {
    generatorModalOpen,
    generatorLoading,
    generatorError,

    campaignEvents,
    eventsLoading,
    eventsError,

    openGeneratorModal,
    closeGeneratorModal,
    handleGenerateSuggestion,
    loadCampaignEvents,
  };
}