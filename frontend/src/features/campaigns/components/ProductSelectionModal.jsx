// frontend/src/features/campaigns/components/ProductSelectionModal.jsx
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FormSelect } from "../../../shared/components";
import "./ProductSelectionModal.css";

const ProductSelectionModal = ({
  isOpen,
  onClose,
  onApply,
  loading,
  searchValue,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  sortValue,
  onSortChange,
  categories,
  products,
  selectedCount,
  draftCount = 0,
  hasAvailableToSelect,
  onAddProduct,
}) => {
  const { t } = useTranslation("campaigns");

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const categoryOptions = useMemo(
    () => [
      {
        value: "all",
        label: t("filters.allCategories"),
      },
      ...categories.map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [categories, t],
  );

  const sortOptions = useMemo(
    () => [
      {
        value: "name-asc",
        label: t("filters.sortNameAsc"),
      },
      {
        value: "name-desc",
        label: t("filters.sortNameDesc"),
      },
      {
        value: "category",
        label: t("filters.sortCategory"),
      },
    ],
    [t],
  );

  if (!isOpen) return null;

  const emptyMessage = loading
    ? t("messages.loadingProducts")
    : hasAvailableToSelect
      ? t("messages.noMatchingProducts")
      : t("messages.noProductsLeftToSelect");

  return (
    <div
      className="product-selection-modal__overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="product-selection-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-product-modal-title"
      >
        <div className="product-selection-modal__header">
          <div>
            <h3 id="campaign-product-modal-title">{t("picker.modalTitle")}</h3>
            <p>{t("picker.modalSubtitle")}</p>
          </div>

          <button
            type="button"
            className="product-selection-modal__close"
            onClick={onClose}
            aria-label={t("actions.cancel")}
          >
            ×
          </button>
        </div>

        <div className="product-selection-modal__controls">
          <div className="product-selection-modal__field product-selection-modal__field--search">
            <label htmlFor="campaign-product-search">
              {t("filters.search")}
            </label>

            <input
              id="campaign-product-search"
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("fields.productsSearchPlaceholder")}
            />
          </div>

          <div className="product-selection-modal__field">
            <FormSelect
              label={t("filters.category")}
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
              options={categoryOptions}
            />
          </div>

          <div className="product-selection-modal__field">
            <FormSelect
              label={t("filters.sortBy")}
              value={sortValue}
              onChange={(e) => onSortChange(e.target.value)}
              options={sortOptions}
            />
          </div>
        </div>

        <div className="product-selection-modal__body">
          {products.length ? (
            <div className="product-selection-modal__grid">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="product-selection-modal__card"
                  onClick={() => onAddProduct(product)}
                >
                  <div className="product-selection-modal__card-content">
                    <span className="product-selection-modal__card-name">
                      {product.name}
                    </span>

                    <span className="product-selection-modal__card-category">
                      {product.category}
                    </span>
                  </div>

                  <span className="product-selection-modal__card-action">
                    {t("actions.add")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="product-selection-modal__empty">{emptyMessage}</div>
          )}
        </div>

        <div className="product-selection-modal__footer">
          <p>
            {t("picker.selectedCountText", { count: selectedCount })}
            {draftCount > 0
              ? ` · ${t("picker.pendingCountText", {
                  count: draftCount,
                  defaultValue: `${draftCount} pending`,
                })}`
              : ""}
          </p>

          <div className="product-selection-modal__footer-actions">
            <button
              type="button"
              className="product-selection-modal__button product-selection-modal__button--secondary"
              onClick={onClose}
            >
              {t("actions.cancel")}
            </button>

            <button
              type="button"
              className="product-selection-modal__button product-selection-modal__button--primary"
              onClick={onApply}
            >
              {t("actions.apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSelectionModal;