import { normalizeText } from "./campaignSuggestionUtils";

export const GENERATE_MODES = {
  FULL: "full",
  PRODUCTS: "products",
  PRODUCTS_WITH_DATES: "products_with_dates",
  TARGETS: "targets",
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

const getDateRange = ({ startDate, endDate, formData }) => ({
  safeStartDate: startDate || formData.startDate,
  safeEndDate: endDate || formData.endDate,
});

const hasDateValue = (value) => Boolean(String(value || "").trim());

const validateOptionalDateRange = ({ safeStartDate, safeEndDate, t }) => {
  const hasStartDate = hasDateValue(safeStartDate);
  const hasEndDate = hasDateValue(safeEndDate);

  if (hasStartDate !== hasEndDate) {
    throw new Error(
      t("generator.errors.completeOrLeaveDates", {
        defaultValue:
          "Choose both start and end dates, or leave both empty so AIMOPS can suggest them.",
      }),
    );
  }

  if (hasStartDate && hasEndDate) {
    const start = new Date(safeStartDate);
    const end = new Date(safeEndDate);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      if (end < start) {
        throw new Error(
          t("validation.endDateInvalid", {
            defaultValue: "End date must be after the start date.",
          }),
        );
      }
    }
  }
};

const getOptionalDatePayload = ({ safeStartDate, safeEndDate }) => {
  const payload = {};

  if (hasDateValue(safeStartDate)) {
    payload.start_date = safeStartDate;
  }

  if (hasDateValue(safeEndDate)) {
    payload.end_date = safeEndDate;
  }

  return payload;
};

const normalizeTargetQuantities = ({
  productIds = [],
  targetQuantities = {},
  selectedProducts = [],
}) => {
  const selectedProductLookup = new Map(
    selectedProducts.map((product) => [
      String(product.product_id),
      product.target_quantity,
    ]),
  );

  return productIds.reduce((acc, productId) => {
    const key = String(productId);

    const rawValue =
      targetQuantities?.[key] ??
      targetQuantities?.[productId] ??
      selectedProductLookup.get(key);

    const quantity = Number(rawValue);

    if (Number.isFinite(quantity) && quantity > 0) {
      acc[key] = quantity;
    }

    return acc;
  }, {});
};

export const buildGeneratePayload = ({
  mode,
  eventId,
  eventName,
  productIds,
  targetQuantities,
  startDate,
  endDate,
  formData,
  selectedProducts,
  t,
}) => {
  const { safeStartDate, safeEndDate } = getDateRange({
    startDate,
    endDate,
    formData,
  });

  if (mode === GENERATE_MODES.FULL) {
    validateOptionalDateRange({ safeStartDate, safeEndDate, t });

    return {
      payload: {
        ...getOptionalDatePayload({ safeStartDate, safeEndDate }),
      },
    };
  }

  if (
    mode === GENERATE_MODES.PRODUCTS ||
    mode === GENERATE_MODES.PRODUCTS_WITH_DATES
  ) {
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

    validateOptionalDateRange({ safeStartDate, safeEndDate, t });

    return {
      payload: {
        mode: "products_given",
        product_ids: safeProductIds,
        ...getOptionalDatePayload({ safeStartDate, safeEndDate }),
      },
    };
  }

  if (mode === GENERATE_MODES.TARGETS) {
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

    const safeTargetQuantities = normalizeTargetQuantities({
      productIds: safeProductIds,
      targetQuantities,
      selectedProducts,
    });

    if (Object.keys(safeTargetQuantities).length !== safeProductIds.length) {
      throw new Error(
        t("generator.errors.targetQuantitiesRequired", {
          defaultValue: "Enter a target quantity for every selected product.",
        }),
      );
    }

    validateOptionalDateRange({ safeStartDate, safeEndDate, t });

    return {
      payload: {
        mode: "targets_given",
        product_ids: safeProductIds,
        target_quantities: safeTargetQuantities,
        ...getOptionalDatePayload({ safeStartDate, safeEndDate }),
      },
    };
  }

  if (mode === GENERATE_MODES.EVENT) {
    const safeEventId = Number(eventId);
    const safeEventName = normalizeText(eventName);

    if (!Number.isFinite(safeEventId) || safeEventId <= 0) {
      throw new Error(
        t("generator.errors.eventRequired", {
          defaultValue: "Choose one event from your events list first.",
        }),
      );
    }

    return {
      payload: {
        mode: "event_given",
        event_id: safeEventId,
      },
      meta: {
        eventName: safeEventName,
      },
    };
  }

  if (mode === GENERATE_MODES.CLEARANCE) {
    validateOptionalDateRange({ safeStartDate, safeEndDate, t });

    return {
      payload: {
        mode: "clearance",
        ...getOptionalDatePayload({ safeStartDate, safeEndDate }),
      },
    };
  }

  return {
    payload: {},
  };
};