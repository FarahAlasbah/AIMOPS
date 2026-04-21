import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, PageHeader, FormCalendar } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { createCampaign, publishCampaign } from "../../../api/campaigns";
import { getProducts } from "../../../api/products";
import {
  buildCampaignPayload,
  CAMPAIGN_TYPES,
  CHANNEL_OPTIONS,
  DEFAULT_FORM_DATA,
  normalizeCampaignResponse,
  normalizeProductsResponse,
} from "../utils";
import { CampaignInsights, ProductPicker } from "../components";
import "./NewCampaign.css";

const NewCampaign = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");
  const { hasPermission } = useAuth();

  const canCreate = hasPermission ? hasPermission("campaigns.create") : true;

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitMode, setSubmitMode] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [createdResult, setCreatedResult] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      setLoadingProducts(true);

      try {
        const response = await getProducts();
        const normalized = normalizeProductsResponse(response);

        if (!ignore) {
          setAvailableProducts(normalized);
        }
      } catch (error) {
        if (!ignore) {
          setPageError(error.message || t("messages.productsLoadError"));
        }
      } finally {
        if (!ignore) {
          setLoadingProducts(false);
        }
      }
    };

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [t]);

  const breadcrumbs = [
    {
      label: t("list.title"),
      link: true,
      onClick: () => navigate("/app/campaigns"),
    },
    {
      label: t("form.title"),
      link: false,
    },
  ];

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const toggleChannel = (channel) => {
    setFormData((prev) => {
      const exists = prev.channels.includes(channel);

      return {
        ...prev,
        channels: exists
          ? prev.channels.filter((item) => item !== channel)
          : [...prev.channels, channel],
      };
    });

    setErrors((prev) => ({
      ...prev,
      channels: undefined,
    }));
  };

  const addProduct = (product) => {
  setSelectedProducts((prev) => {
    if (prev.some((item) => item.product_id === product.id)) {
      return prev;
    }

    return [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        target_quantity: "",
        discount_pct: 0,
      },
    ];
  });

  setErrors((prev) => ({
    ...prev,
    selectedProducts: undefined,
    productsById: undefined,
  }));
};
  const removeProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.filter((item) => item.product_id !== productId)
    );
  };

  const updateSelectedProduct = (productId, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, [field]: value } : item
      )
    );
  };

  const validateForm = () => {
    const nextErrors = {};
    const productsById = {};

    if (!formData.campaignName.trim()) {
      nextErrors.campaignName = t("validation.campaignNameRequired");
    }

    if (!formData.startDate) {
      nextErrors.startDate = t("validation.startDateRequired");
    }

    if (!formData.endDate) {
      nextErrors.endDate = t("validation.endDateRequired");
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (end < start) {
        nextErrors.endDate = t("validation.endDateInvalid");
      }
    }

    if (
  formData.budget !== "" &&
  formData.budget !== null &&
  formData.budget !== undefined &&
  Number(formData.budget) < 0
) {
  nextErrors.budget = t("validation.budgetInvalid", {
    defaultValue: "Budget cannot be negative",
  });
}

    if (
      formData.campaignType === "other" &&
      !formData.customCampaignTypeName.trim()
    ) {
      nextErrors.customCampaignTypeName = t("validation.customTypeRequired");
    }

    if (!formData.channels.length) {
      nextErrors.channels = t("validation.channelsRequired");
    }

    if (!selectedProducts.length) {
      nextErrors.selectedProducts = t("validation.productsRequired");
    }

    selectedProducts.forEach((product) => {
      const productErrors = {};
      const hasDiscountValue =
        product.discount_pct !== "" &&
        product.discount_pct !== null &&
        product.discount_pct !== undefined;

      if (!product.target_quantity || Number(product.target_quantity) <= 0) {
        productErrors.target_quantity = t("validation.targetQuantityRequired");
      }

      if (formData.campaignType === "discount") {
        if (!hasDiscountValue) {
          productErrors.discount_pct = t("validation.discountRequired");
        } else if (
          Number(product.discount_pct) < 0 ||
          Number(product.discount_pct) > 100
        ) {
          productErrors.discount_pct = t("validation.discountRange");
        }
      } else if (
        hasDiscountValue &&
        (Number(product.discount_pct) < 0 || Number(product.discount_pct) > 100)
      ) {
        productErrors.discount_pct = t("validation.discountRange");
      }

      if (Object.keys(productErrors).length) {
        productsById[product.product_id] = productErrors;
      }
    });

    if (Object.keys(productsById).length) {
      nextErrors.productsById = productsById;
    }

    return nextErrors;
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setSelectedProducts([]);
    setErrors({});
    setPageError("");
    setSuccessMessage("");
    setCreatedResult(null);
  };

  const handleSubmit = async (mode) => {
    const nextErrors = validateForm();
    setErrors(nextErrors);
    setPageError("");
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitMode(mode);

    try {
      const payload = buildCampaignPayload({ formData, selectedProducts });
      const createResponse = await createCampaign(payload);
      const created = normalizeCampaignResponse(createResponse);

      let finalResult = created;

      if (mode === "publish") {
        try {
          await publishCampaign(created.campaign_id);
          finalResult = {
            ...created,
            status: "active",
          };
          setSuccessMessage(t("messages.createPublishedSuccess"));
        } catch {
          finalResult = {
            ...created,
            status: created.status || "planned",
          };
          setPageError(t("messages.publishFailedStillPlanned"));
          setSuccessMessage(t("messages.createPlannedSuccess"));
        }
      } else {
        setSuccessMessage(t("messages.createPlannedSuccess"));
      }

      setCreatedResult(finalResult);
    } catch (error) {
      setPageError(error.message || t("messages.createError"));
    } finally {
      setSubmitMode("");
    }
  };

  if (!canCreate) {
    return (
      <div className="new-campaign-page">
        <Card>
          <div className="campaign-permission-state">
            {t("messages.noPermission")}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="new-campaign-page">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={t("form.title")}
        subtitle={t("form.subtitle")}
      />

      {pageError ? <div className="campaign-page-alert error">{pageError}</div> : null}
      {successMessage ? (
        <div className="campaign-page-alert success">{successMessage}</div>
      ) : null}

      <Card>
        <div className="campaign-form-shell">
          <section className="campaign-form-section">
            <div className="section-header">
              <h3>{t("form.sections.details")}</h3>
              <p>{t("form.sections.detailsSubtitle")}</p>
            </div>

            <div className="form-grid two-columns">
              <div className="field">
                <label>{t("fields.campaignName")}</label>
                <input
                  type="text"
                  value={formData.campaignName}
                  onChange={(e) => updateField("campaignName", e.target.value)}
                  placeholder={t("fields.campaignNamePlaceholder")}
                />
                {errors.campaignName ? (
                  <p className="field-error">{errors.campaignName}</p>
                ) : null}
              </div>

              <div className="field">
                <label>{t("fields.budget")}</label>
                <input
  type="number"
  min="0"
  step="0.01"
  value={formData.budget}
onChange={(e) => {
  const value = e.target.value;
  updateField("budget", value === "" ? 0 : value);
}}  placeholder={t("fields.budgetPlaceholder", {
    defaultValue: "0 (optional)",
  })}
/>
                {errors.budget ? (
                  <p className="field-error">{errors.budget}</p>
                ) : null}
              </div>
            </div>

            <div className="field">
              <label>{t("fields.campaignType")}</label>
              <div className="campaign-type-grid">
                {CAMPAIGN_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`choice-card ${
                      formData.campaignType === type ? "active" : ""
                    }`}
                    onClick={() => updateField("campaignType", type)}
                  >
                    {t(`types.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {formData.campaignType === "other" ? (
              <div className="field">
                <label>{t("fields.customCampaignTypeName")}</label>
                <input
                  type="text"
                  value={formData.customCampaignTypeName}
                  onChange={(e) =>
                    updateField("customCampaignTypeName", e.target.value)
                  }
                  placeholder={t("fields.customCampaignTypeNamePlaceholder")}
                />
                {errors.customCampaignTypeName ? (
                  <p className="field-error">{errors.customCampaignTypeName}</p>
                ) : null}
              </div>
            ) : null}

            <div className="field">
              <label>{t("fields.notes")}</label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder={t("fields.notesPlaceholder")}
              />
            </div>
          </section>

          <section className="campaign-form-section">
            <div className="section-header">
              <h3>{t("form.sections.schedule")}</h3>
              <p>{t("form.sections.scheduleSubtitle")}</p>
            </div>

            <div className="form-grid two-columns">
              <FormCalendar
                label={t("fields.startDate")}
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                required
                error={errors.startDate}
              />

              <FormCalendar
                label={t("fields.endDate")}
                value={formData.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                min={formData.startDate || undefined}
                required
                error={errors.endDate}
              />
            </div>
          </section>

          <section className="campaign-form-section">
            <div className="section-header">
              <h3>{t("form.sections.channels")}</h3>
              <p>{t("form.sections.channelsSubtitle")}</p>
            </div>

            <div className="channels-wrap">
              {CHANNEL_OPTIONS.map((channel) => {
                const selected = formData.channels.includes(channel);

                return (
                  <button
                    key={channel}
                    type="button"
                    className={`channel-chip ${selected ? "active" : ""}`}
                    onClick={() => toggleChannel(channel)}
                  >
                    {t(`channels.${channel}`)}
                  </button>
                );
              })}
            </div>

            {errors.channels ? (
              <p className="field-error">{errors.channels}</p>
            ) : null}
          </section>

          <section className="campaign-form-section">
            <div className="section-header">
              <h3>{t("form.sections.products")}</h3>
              <p>{t("form.sections.productsSubtitle")}</p>
            </div>

            <ProductPicker
              loading={loadingProducts}
              availableProducts={availableProducts}
              selectedProducts={selectedProducts}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
              onUpdateProduct={updateSelectedProduct}
              campaignType={formData.campaignType}
              errors={errors}
            />
          </section>

          <div className="campaign-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/app/campaigns")}
            >
              {t("actions.cancel")}
            </button>

            <div className="campaign-form-actions-right">
              <button
                type="button"
                className="btn-outline"
                disabled={!!submitMode}
                onClick={() => handleSubmit("planned")}
              >
                {submitMode === "planned"
                  ? t("actions.saving")
                  : t("actions.saveAsPlanned")}
              </button>

              <button
                type="button"
                className="btn-primary"
                disabled={!!submitMode}
                onClick={() => handleSubmit("publish")}
              >
                {submitMode === "publish"
                  ? t("actions.publishing")
                  : t("actions.createAndPublish")}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {createdResult ? (
        <Card>
          <div className="campaign-created-top">
            <div>
              <h3>{createdResult.campaign_name}</h3>
              {/* <p>{t("messages.createdCampaignSummary")}</p> */}
            </div>

            <div className="campaign-created-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => navigate(`/app/campaigns/${createdResult.campaign_id}`)}
              >
                {t("actions.view")}
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={resetForm}
              >
                {t("actions.createAnother")}
              </button>
            </div>
          </div>

          <CampaignInsights result={createdResult} />
        </Card>
      ) : null}
    </div>
  );
};

export default NewCampaign;