import { useEffect, useState } from "react";

import { createCampaign, publishCampaign } from "../../../api/campaigns";
import { getProducts } from "../../../api/products";
import {
  buildCampaignPayload,
  DEFAULT_FORM_DATA,
  normalizeCampaignResponse,
  normalizeProductsResponse,
} from "../utils";
import { hasValue } from "../utils/campaignSuggestionUtils";
import { useCampaignGenerator } from "./useCampaignGenerator";

export function useNewCampaign(t) {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitMode, setSubmitMode] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [createdResult, setCreatedResult] = useState(null);
  const [generatedFields, setGeneratedFields] = useState({});

  const clearGeneratedField = (field) => {
    setGeneratedFields((prev) => {
      if (!prev[field]) return prev;

      const next = { ...prev };
      delete next[field];

      return next;
    });
  };

  const clearGeneratedProducts = () => {
    clearGeneratedField("products");
  };

  const {
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
  } = useCampaignGenerator({
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
  });

  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      setLoadingProducts(true);

      try {
        const response = await getProducts();
        const normalized = normalizeProductsResponse(response);

        if (!ignore) {
          setAvailableProducts(normalized);
        }
      } catch (error) {
        if (!ignore) {
          setPageError(error.message || t("messages.productsLoadError"));
        }
      } finally {
        if (!ignore) {
          setLoadingProducts(false);
        }
      }
    };

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [t]);

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    clearGeneratedField(field);
    setCreatedResult(null);

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const toggleChannel = (channel) => {
    setFormData((prev) => {
      const exists = prev.channels.includes(channel);

      return {
        ...prev,
        channels: exists
          ? prev.channels.filter((item) => item !== channel)
          : [...prev.channels, channel],
      };
    });

    clearGeneratedField("channels");
    setCreatedResult(null);

    setErrors((prev) => ({
      ...prev,
      channels: undefined,
    }));
  };

  const addProduct = (product) => {
    setSelectedProducts((prev) => {
      if (prev.some((item) => item.product_id === product.id)) {
        return prev;
      }

      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          category: product.category,
          target_quantity: "",
          discount_pct: "",
        },
      ];
    });

    clearGeneratedProducts();
    setCreatedResult(null);

    setErrors((prev) => ({
      ...prev,
      selectedProducts: undefined,
      productsById: undefined,
    }));
  };

  const removeProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.filter((item) => item.product_id !== productId),
    );

    clearGeneratedProducts();
    setCreatedResult(null);
  };

  const updateSelectedProduct = (productId, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, [field]: value } : item,
      ),
    );

    clearGeneratedProducts();
    setCreatedResult(null);

    setErrors((prev) => {
      const currentProductErrors = prev.productsById?.[productId];

      if (!currentProductErrors?.[field]) return prev;

      const nextProductErrors = { ...currentProductErrors };
      delete nextProductErrors[field];

      const nextProductsById = { ...(prev.productsById || {}) };

      if (Object.keys(nextProductErrors).length) {
        nextProductsById[productId] = nextProductErrors;
      } else {
        delete nextProductsById[productId];
      }

      return {
        ...prev,
        productsById: Object.keys(nextProductsById).length
          ? nextProductsById
          : undefined,
      };
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    const productsById = {};

    if (!formData.campaignName.trim()) {
      nextErrors.campaignName = t("validation.campaignNameRequired");
    }

    if (!formData.startDate) {
      nextErrors.startDate = t("validation.startDateRequired");
    }

    if (!formData.endDate) {
      nextErrors.endDate = t("validation.endDateRequired");
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (end < start) {
        nextErrors.endDate = t("validation.endDateInvalid");
      }
    }

    if (
      formData.budget !== "" &&
      formData.budget !== null &&
      formData.budget !== undefined &&
      Number(formData.budget) < 0
    ) {
      nextErrors.budget = t("validation.budgetInvalid");
    }

    if (
      formData.campaignType === "other" &&
      !formData.customCampaignTypeName.trim()
    ) {
      nextErrors.customCampaignTypeName = t("validation.customTypeRequired");
    }

    if (!formData.channels.length) {
      nextErrors.channels = t("validation.channelsRequired");
    }

    selectedProducts.forEach((product) => {
      const productErrors = {};
      const hasTargetQuantity = hasValue(product.target_quantity);
      const hasDiscountValue = hasValue(product.discount_pct);

      if (hasTargetQuantity && Number(product.target_quantity) <= 0) {
        productErrors.target_quantity = t("validation.targetQuantityInvalid", {
          defaultValue: "Target quantity must be greater than 0.",
        });
      }

      if (
        hasDiscountValue &&
        (Number(product.discount_pct) < 0 || Number(product.discount_pct) > 100)
      ) {
        productErrors.discount_pct = t("validation.discountRange");
      }

      if (Object.keys(productErrors).length) {
        productsById[product.product_id] = productErrors;
      }
    });

    if (Object.keys(productsById).length) {
      nextErrors.productsById = productsById;
    }

    return nextErrors;
  };

  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM_DATA });
    setSelectedProducts([]);
    setErrors({});
    setPageError("");
    setSuccessMessage("");
    setCreatedResult(null);
    setGeneratedFields({});
  };

  const handleSubmit = async (mode = "publish") => {
    if (createdResult?.status === "active") return;

    const nextErrors = validateForm();
    setErrors(nextErrors);
    setPageError("");
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitMode(mode);

    try {
      const payload = buildCampaignPayload({ formData, selectedProducts });
      const createResponse = await createCampaign(payload);
      const created = normalizeCampaignResponse(createResponse);

      let finalResult = created;

      if (mode === "publish") {
        try {
          await publishCampaign(created.campaign_id);

          finalResult = {
            ...created,
            status: "active",
          };

          setSuccessMessage(t("messages.createPublishedSuccess"));
        } catch {
          finalResult = {
            ...created,
            status: created.status || "planned",
          };

          setPageError(t("messages.publishFailedStillPlanned"));
          setSuccessMessage(t("messages.createPlannedSuccess"));
        }
      } else {
        setSuccessMessage(t("messages.createPlannedSuccess"));
      }

      setGeneratedFields({});
      setCreatedResult(finalResult);
    } catch (error) {
      setPageError(error.message || t("messages.createError"));
    } finally {
      setSubmitMode("");
    }
  };

  return {
    formData,
    availableProducts,
    selectedProducts,
    loadingProducts,
    submitMode,
    pageError,
    successMessage,
    errors,
    createdResult,
    generatedFields,

    generatorModalOpen,
    generatorLoading,
    generatorError,

    campaignEvents,
    eventsLoading,
    eventsError,

    updateField,
    toggleChannel,
    addProduct,
    removeProduct,
    updateSelectedProduct,
    resetForm,
    handleSubmit,

    openGeneratorModal,
    closeGeneratorModal,
    handleGenerateSuggestion,
    loadCampaignEvents,
  };
}