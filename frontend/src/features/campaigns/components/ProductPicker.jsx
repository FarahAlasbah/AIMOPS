// frontend/src/features/campaigns/components/ProductPicker.jsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ProductSelectionModal from "./ProductSelectionModal";
import "./ProductPicker.css";

const ProductPicker = ({
  loading,
  availableProducts,
  selectedProducts,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  campaignType,
  errors,
}) => {
  const { t } = useTranslation("campaigns");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortValue, setSortValue] = useState("name-asc");
  const [draftProducts, setDraftProducts] = useState([]);

  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((item) => item.product_id)),
    [selectedProducts],
  );

  const draftIds = useMemo(
    () => new Set(draftProducts.map((item) => item.id)),
    [draftProducts],
  );

  const blockedIds = useMemo(() => {
    return new Set([...selectedIds, ...draftIds]);
  }, [selectedIds, draftIds]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        availableProducts
          .map((product) => product.category)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [availableProducts]);

  const hasAvailableToSelect = useMemo(() => {
    return availableProducts.some((product) => !blockedIds.has(product.id));
  }, [availableProducts, blockedIds]);

  const filteredProducts = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    const nextProducts = availableProducts
      .filter((product) => !blockedIds.has(product.id))
      .filter((product) => {
        const name = String(product.name || "").toLowerCase();
        const category = String(product.category || "").toLowerCase();

        const matchesQuery =
          !query || name.includes(query) || category.includes(query);

        const matchesCategory =
          categoryFilter === "all" || product.category === categoryFilter;

        return matchesQuery && matchesCategory;
      });

    switch (sortValue) {
      case "name-desc":
        return nextProducts.sort((a, b) => b.name.localeCompare(a.name));

      case "category":
        return nextProducts.sort((a, b) => {
          const categoryCompare = a.category.localeCompare(b.category);
          if (categoryCompare !== 0) return categoryCompare;
          return a.name.localeCompare(b.name);
        });

      case "name-asc":
      default:
        return nextProducts.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [availableProducts, blockedIds, searchValue, categoryFilter, sortValue]);

  const getProductError = (productId, field) =>
    errors?.productsById?.[productId]?.[field];

  const previewNames = selectedProducts
    .slice(0, 3)
    .map((item) => item.product_name)
    .join(", ");

  const remainingCount = Math.max(selectedProducts.length - 3, 0);

  const openModal = () => {
    setDraftProducts([]);
    setIsModalOpen(true);
  };

  const cancelModal = () => {
    setDraftProducts([]);
    setIsModalOpen(false);
  };

  const addDraftProduct = (product) => {
    setDraftProducts((prev) => {
      if (prev.some((item) => item.id === product.id)) return prev;
      return [...prev, product];
    });
  };

  const applyDraftProducts = () => {
    draftProducts.forEach((product) => {
      onAddProduct(product);
    });

    setDraftProducts([]);
    setIsModalOpen(false);
  };

  return (
    <div className="product-picker">
      <div className="product-picker-toolbar">
        <div className="product-picker-summary">
          <div className="product-picker-summary-header">
            <span className="product-picker-summary-label">
              {t("picker.selectedProductsLabel")}
            </span>

            <button
              type="button"
              className="product-picker-open-btn"
              onClick={openModal}
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

      {errors?.selectedProducts ? (
        <p className="product-picker-error">{errors.selectedProducts}</p>
      ) : null}

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
                      <label>{t("fields.targetQuantity")}</label>
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
                          {getProductError(
                            product.product_id,
                            "target_quantity",
                          )}
                        </p>
                      ) : null}
                    </div>

                    <div className="selected-product-field compact">
                      <label>
                        {t("fields.discountPct")}
                        {campaignType === "discount"
                          ? ""
                          : ` (${t("common.optional")})`}
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

      <ProductSelectionModal
        isOpen={isModalOpen}
        onClose={cancelModal}
        onApply={applyDraftProducts}
        loading={loading}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        sortValue={sortValue}
        onSortChange={setSortValue}
        categories={categories}
        products={filteredProducts}
        selectedCount={selectedProducts.length + draftProducts.length}
        draftCount={draftProducts.length}
        hasAvailableToSelect={hasAvailableToSelect}
        onAddProduct={addDraftProduct}
      />
    </div>
  );
};

export default ProductPicker;