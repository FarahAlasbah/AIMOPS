import { useTranslation } from "react-i18next";

import ProductSelectionModal from "./ProductSelectionModal";
import ProductPickerSummary from "./product-picker/ProductPickerSummary";
import SelectedProductsPanel from "./product-picker/SelectedProductsPanel";

import { useProductPicker } from "../hooks/useProductPicker";

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

  const {
    isModalOpen,
    searchValue,
    setSearchValue,
    categoryFilter,
    setCategoryFilter,
    sortValue,
    setSortValue,
    draftProducts,
    categories,
    hasAvailableToSelect,
    filteredProducts,

    openModal,
    cancelModal,
    addDraftProduct,
    applyDraftProducts,
  } = useProductPicker({
    availableProducts,
    selectedProducts,
    onAddProduct,
  });

  return (
    <div className="product-picker">
      <ProductPickerSummary
        t={t}
        selectedProducts={selectedProducts}
        onOpen={openModal}
      />

      {errors?.selectedProducts ? (
        <p className="product-picker-error">{errors.selectedProducts}</p>
      ) : null}

      <SelectedProductsPanel
        t={t}
        selectedProducts={selectedProducts}
        campaignType={campaignType}
        errors={errors}
        onRemoveProduct={onRemoveProduct}
        onUpdateProduct={onUpdateProduct}
      />

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