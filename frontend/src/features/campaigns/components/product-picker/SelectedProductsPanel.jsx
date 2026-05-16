export default function SelectedProductsPanel({
  t,
  selectedProducts,
  campaignType,
  errors,
  onRemoveProduct,
  onUpdateProduct,
}) {
  const getProductError = (productId, field) =>
    errors?.productsById?.[productId]?.[field];

  return (
    <div className="selected-products-panel">
      {selectedProducts.length ? (
        <>
          <div className="selected-products-panel-header">
            <span>{t("fields.products")}</span>
            <span>{selectedProducts.length}</span>
          </div>

          <div className="selected-products-list compact">
            {selectedProducts.map((product) => (
              <div key={product.product_id} className="selected-product-row">
                <div className="selected-product-meta">
                  <h4>{product.product_name}</h4>
                  <p>{product.category}</p>
                </div>

                <div className="selected-product-inputs">
                  <div className="selected-product-field compact">
                    <label>
                      {t("fields.targetQuantity")} ({t("common.optional")})
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={product.target_quantity}
                      onChange={(e) =>
                        onUpdateProduct(
                          product.product_id,
                          "target_quantity",
                          e.target.value,
                        )
                      }
                      placeholder={t("fields.targetQuantityPlaceholder")}
                    />

                    {getProductError(product.product_id, "target_quantity") ? (
                      <p className="product-picker-error">
                        {getProductError(product.product_id, "target_quantity")}
                      </p>
                    ) : null}
                  </div>

                  <div className="selected-product-field compact">
                    <label>
                      {t("fields.discountPct")} ({t("common.optional")})
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={product.discount_pct}
                      onChange={(e) =>
                        onUpdateProduct(
                          product.product_id,
                          "discount_pct",
                          e.target.value,
                        )
                      }
                      placeholder={
                        campaignType === "discount"
                          ? t("fields.discountRequiredPlaceholder")
                          : t("fields.discountOptionalPlaceholder")
                      }
                    />

                    {getProductError(product.product_id, "discount_pct") ? (
                      <p className="product-picker-error">
                        {getProductError(product.product_id, "discount_pct")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="remove-product-btn"
                  onClick={() => onRemoveProduct(product.product_id)}
                >
                  {t("actions.remove")}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="selected-products-empty">
          {t("messages.noSelectedProducts")}
        </div>
      )}
    </div>
  );
}