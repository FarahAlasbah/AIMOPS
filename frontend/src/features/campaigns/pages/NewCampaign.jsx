import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";

import CreatedCampaignResult from "../components/new-campaign/CreatedCampaignResult";
import NewCampaignChannelsSection from "../components/new-campaign/NewCampaignChannelsSection";
import NewCampaignDetailsSection from "../components/new-campaign/NewCampaignDetailsSection";
import NewCampaignFormActions from "../components/new-campaign/NewCampaignFormActions";
import NewCampaignHeaderActions from "../components/new-campaign/NewCampaignHeaderActions";
import NewCampaignProductsSection from "../components/new-campaign/NewCampaignProductsSection";
import NewCampaignScheduleSection from "../components/new-campaign/NewCampaignScheduleSection";

import { useNewCampaign } from "../hooks/useNewCampaign";

import "./NewCampaign.css";

const NewCampaign = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");
  const { hasPermission } = useAuth();

  const canCreate = hasPermission ? hasPermission("campaigns.create") : true;

  const {
    formData,
    availableProducts,
    selectedProducts,
    loadingProducts,
    submitMode,
    pageError,
    successMessage,
    errors,
    createdResult,

    updateField,
    toggleChannel,
    addProduct,
    removeProduct,
    updateSelectedProduct,
    resetForm,
    handleSubmit,
  } = useNewCampaign(t);

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
        actions={
          <NewCampaignHeaderActions
            t={t}
            onBack={() => navigate("/app/campaigns")}
          />
        }
      />

      {pageError ? (
        <div className="campaign-page-alert error">{pageError}</div>
      ) : null}

      {successMessage ? (
        <div className="campaign-page-alert success">{successMessage}</div>
      ) : null}

      <Card>
        <div className="campaign-form-shell">
          <NewCampaignDetailsSection
            t={t}
            formData={formData}
            errors={errors}
            onUpdateField={updateField}
          />

          <NewCampaignScheduleSection
            t={t}
            formData={formData}
            errors={errors}
            onUpdateField={updateField}
          />

          <NewCampaignChannelsSection
            t={t}
            formData={formData}
            errors={errors}
            onToggleChannel={toggleChannel}
          />

          <NewCampaignProductsSection
            t={t}
            loadingProducts={loadingProducts}
            availableProducts={availableProducts}
            selectedProducts={selectedProducts}
            campaignType={formData.campaignType}
            errors={errors}
            onAddProduct={addProduct}
            onRemoveProduct={removeProduct}
            onUpdateProduct={updateSelectedProduct}
          />

          <NewCampaignFormActions
            t={t}
            submitMode={submitMode}
            createdResult={createdResult}
            onCancel={() => navigate("/app/campaigns")}
            onSubmit={handleSubmit}
          />
        </div>
      </Card>

      <CreatedCampaignResult
        t={t}
        createdResult={createdResult}
        onView={() => navigate(`/app/campaigns/${createdResult.campaign_id}`)}
        onCreateAnother={resetForm}
      />
    </div>
  );
};

export default NewCampaign;