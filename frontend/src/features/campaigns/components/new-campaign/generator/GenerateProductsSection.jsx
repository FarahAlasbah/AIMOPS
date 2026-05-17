// frontend/src/features/campaigns/components/new-campaign/generator/GenerateProductsSection.jsx
import { Search, X } from "lucide-react";

export default function GenerateProductsSection({
  t,
  loading,
  sectionRef,
  needsTargets,
  draftProductIds,
  draftTargetQuantities,
  selectedDraftProducts,
  filteredProducts,
  availableProducts,
  productSearch,
  onProductSearchChange,
  onAddProduct,
  onRemoveProduct,
  onUpdateTargetQuantity,
}) {
  return (
    <div ref={sectionRef} className="generate-campaign-modal__section">
      <div className="generate-campaign-modal__section-header">
        <div>
          <h4>{t("generator.products.selectTitle")}</h4>

          <p>
            {needsTargets
              ? t("generator.targets.selectSubtitle")
              : t("generator.products.selectSubtitle")}
          </p>
        </div>

        <span className="generate-campaign-modal__counter">
          {draftProductIds.length}
        </span>
      </div>

      {selectedDraftProducts.length ? (
        <div className="generate-campaign-modal__selected-products">
          {selectedDraftProducts.map((product) => (
            <span
              key={product.id}
              className="generate-campaign-modal__selected-chip"
            >
              <span>{product.name}</span>

              <button
                type="button"
                onClick={() => onRemoveProduct(product.id)}
                disabled={loading}
                aria-label={t("actions.remove")}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="generate-campaign-modal__hint">
          {t("generator.products.selectedHint")}
        </div>
      )}

      {needsTargets ? (
        <div className="selected-products-panel" style={{ marginBottom: 14 }}>
          {selectedDraftProducts.length ? (
            <>
              <div className="selected-products-panel-header">
                <span>{t("generator.targets.quantityTitle")}</span>
                <span>{selectedDraftProducts.length}</span>
              </div>

              <div className="selected-products-list compact">
                {selectedDraftProducts.map((product) => {
                  const productId = String(product.id);

                  return (
                    <div
                      key={`target-${product.id}`}
                      className="selected-product-row"
                    >
                      <div className="selected-product-meta">
                        <h4>{product.name}</h4>
                        <p>{product.category || "-"}</p>
                      </div>

                      <div className="selected-product-inputs">
                        <div className="selected-product-field compact">
                          <label>{t("fields.targetQuantity")}</label>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={draftTargetQuantities[productId] || ""}
                            onChange={(event) =>
                              onUpdateTargetQuantity(
                                productId,
                                event.target.value,
                              )
                            }
                            placeholder={t("fields.targetQuantityPlaceholder")}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="selected-products-empty">
              {t("generator.targets.pickProductsFirst")}
            </div>
          )}
        </div>
      ) : null}

      <div className="generate-campaign-modal__search">
        <Search size={16} />

        <input
          type="text"
          value={productSearch}
          onChange={(event) => onProductSearchChange(event.target.value)}
          placeholder={t("fields.productsSearchPlaceholder")}
          disabled={loading}
        />
      </div>

      {filteredProducts.length ? (
        <div className="generate-campaign-modal__product-list">
          {filteredProducts.map((product) => {
            const isSelected = draftProductIds.includes(String(product.id));

            return (
              <button
                key={product.id}
                type="button"
                className={`generate-campaign-modal__product-card ${
                  isSelected ? "active" : ""
                }`}
                onClick={() => {
                  if (!isSelected) onAddProduct(product.id);
                }}
                disabled={loading}
              >
                <span className="generate-campaign-modal__product-meta">
                  <span className="generate-campaign-modal__product-name">
                    {product.name}
                  </span>

                  <span className="generate-campaign-modal__product-category">
                    {product.category || "-"}
                  </span>
                </span>

                <span className="generate-campaign-modal__product-action">
                  {isSelected
                    ? t("generator.products.added")
                    : t("actions.add")}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="generate-campaign-modal__notice">
          {availableProducts.length
            ? t("generator.products.noMatchingProducts")
            : t("generator.products.noProducts")}
        </div>
      )}
    </div>
  );
}