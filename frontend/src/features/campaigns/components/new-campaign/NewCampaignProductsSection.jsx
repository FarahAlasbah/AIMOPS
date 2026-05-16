import ProductPicker from "../ProductPicker";

export default function NewCampaignProductsSection({
  t,
  loadingProducts,
  availableProducts,
  selectedProducts,
  campaignType,
  errors,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
}) {
  return (
    <section className="campaign-form-section">
      <div className="section-header">
        <h3>{t("form.sections.products")}</h3>
        <p>{t("form.sections.productsSubtitle")}</p>
      </div>

      <ProductPicker
        loading={loadingProducts}
        availableProducts={availableProducts}
        selectedProducts={selectedProducts}
        onAddProduct={onAddProduct}
        onRemoveProduct={onRemoveProduct}
        onUpdateProduct={onUpdateProduct}
        campaignType={campaignType}
        errors={errors}
      />
    </section>
  );
}