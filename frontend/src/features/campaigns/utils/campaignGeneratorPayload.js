import { normalizeText } from "./campaignSuggestionUtils";

export const GENERATE_MODES = {
  FULL: "full",
  PRODUCTS: "products",
  PRODUCTS_WITH_DATES: "products_with_dates",
  EVENT: "event",
  CLEARANCE: "clearance",
};

const getSelectedProductIds = (selectedProducts = []) =>
  selectedProducts
    .map((product) => Number(product.product_id))
    .filter((productId) => Number.isFinite(productId) && productId > 0);

const normalizeProductIds = ({ productIds, selectedProducts }) => {
  const modalProductIds = Array.isArray(productIds)
    ? productIds
        .map((productId) => Number(productId))
        .filter((productId) => Number.isFinite(productId) && productId > 0)
    : [];

  return modalProductIds.length
    ? modalProductIds
    : getSelectedProductIds(selectedProducts);
};

export const buildGeneratePayload = ({
  mode,
  eventName,
  productIds,
  startDate,
  endDate,
  formData,
  selectedProducts,
  t,
}) => {
  if (mode === GENERATE_MODES.FULL) {
    return {
      payload: {},
    };
  }

  if (mode === GENERATE_MODES.PRODUCTS) {
    const safeProductIds = normalizeProductIds({
      productIds,
      selectedProducts,
    });

    if (!safeProductIds.length) {
      throw new Error(
        t("generator.errors.productsRequired", {
          defaultValue: "Choose at least one product first.",
        }),
      );
    }

    return {
      payload: {
        mode: "products_given",
        product_ids: safeProductIds,
      },
    };
  }

  if (mode === GENERATE_MODES.PRODUCTS_WITH_DATES) {
    const safeProductIds = normalizeProductIds({
      productIds,
      selectedProducts,
    });

    const safeStartDate = startDate || formData.startDate;
    const safeEndDate = endDate || formData.endDate;

    if (!safeProductIds.length) {
      throw new Error(
        t("generator.errors.productsRequired", {
          defaultValue: "Choose at least one product first.",
        }),
      );
    }

    if (!safeStartDate || !safeEndDate) {
      throw new Error(
        t("generator.errors.datesRequired", {
          defaultValue: "Choose both start and end dates first.",
        }),
      );
    }

    return {
      payload: {
        mode: "products_given",
        product_ids: safeProductIds,
        start_date: safeStartDate,
        end_date: safeEndDate,
      },
    };
  }

  if (mode === GENERATE_MODES.EVENT) {
    const safeEventName = normalizeText(eventName);

    if (!safeEventName) {
      throw new Error(
        t("generator.errors.eventRequired", {
          defaultValue: "Choose one event from your events list first.",
        }),
      );
    }

    return {
      payload: {
        mode: "event_given",
        event_name: safeEventName,
      },
    };
  }

  if (mode === GENERATE_MODES.CLEARANCE) {
    return {
      payload: {
        mode: "clearance",
      },
    };
  }

  return {
    payload: {},
  };
};