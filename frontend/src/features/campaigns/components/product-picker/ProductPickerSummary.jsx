export default function ProductPickerSummary({ t, selectedProducts, onOpen }) {
  const previewNames = selectedProducts
    .slice(0, 3)
    .map((item) => item.product_name)
    .join(", ");

  const remainingCount = Math.max(selectedProducts.length - 3, 0);

  return (
    <div className="product-picker-toolbar">
      <div className="product-picker-summary">
        <div className="product-picker-summary-header">
          <span className="product-picker-summary-label">
            {t("picker.selectedProductsLabel")}
          </span>

          <button
            type="button"
            className="product-picker-open-btn"
            onClick={onOpen}
          >
            {t("actions.selectProducts")}
          </button>
        </div>

        <h4>{selectedProducts.length}</h4>

        <p>
          {selectedProducts.length
            ? remainingCount > 0
              ? t("picker.selectedPreviewWithMore", {
                  names: previewNames,
                  count: remainingCount,
                })
              : previewNames
            : t("picker.selectedEmpty")}
        </p>
      </div>
    </div>
  );
}