// frontend/src/features/campaigns/components/new-campaign/generator/generatorModalUtils.js

export const GENERATE_MODES = {
  FULL: "full",
  PRODUCTS: "products",
  TARGETS: "targets",
  EVENT: "event",
  CLEARANCE: "clearance",
};

export function getInitialTargetQuantities(selectedProducts = []) {
  return selectedProducts.reduce((acc, product) => {
    const productId = String(product.product_id || "");

    if (!productId) return acc;

    acc[productId] =
      product.target_quantity === null ||
      product.target_quantity === undefined
        ? ""
        : String(product.target_quantity);

    return acc;
  }, {});
}

export function hasPositiveQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0;
}

export function getGenerateOptions(t) {
  return [
    {
      value: GENERATE_MODES.FULL,
      title: t("generator.full.title"),
      description: t("generator.full.description"),
    },
    {
      value: GENERATE_MODES.PRODUCTS,
      title: t("generator.products.title"),
      description: t("generator.products.description"),
    },
    {
      value: GENERATE_MODES.TARGETS,
      title: t("generator.targets.title"),
      description: t("generator.targets.description"),
    },
    {
      value: GENERATE_MODES.EVENT,
      title: t("generator.event.title"),
      description: t("generator.event.description"),
    },
    {
      value: GENERATE_MODES.CLEARANCE,
      title: t("generator.clearance.title"),
      description: t("generator.clearance.description"),
    },
  ];
}