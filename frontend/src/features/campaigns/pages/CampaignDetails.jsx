import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { CampaignInsights, ConfirmActionModal } from "../components";

import CampaignChannelsCard from "../components/details/CampaignChannelsCard";
import CampaignDetailsActions from "../components/details/CampaignDetailsActions";
import CampaignDetailsOverviewCard from "../components/details/CampaignDetailsOverviewCard";
import CampaignProductsCard from "../components/details/CampaignProductsCard";
import CampaignScheduleCard from "../components/details/CampaignScheduleCard";
import CampaignTextSummaryCard from "../components/details/CampaignTextSummaryCard";

import { useCampaignDetails } from "../hooks/useCampaignDetails";

import "./CampaignDetails.css";

const CampaignDetails = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");
  const { hasPermission } = useAuth();

  const canUpdate = hasPermission ? hasPermission("campaigns.update") : true;
  const canDelete = hasPermission ? hasPermission("campaigns.delete") : true;

  const {
    campaign,
    loading,
    pageError,
    successMessage,
    warningMessage,
    busyAction,
    confirmAction,
    confirmTitle,
    confirmMessage,
    confirmLabel,
    confirmLoading,
    forecastReadiness,

    setConfirmAction,
    closeConfirmModal,
    handleConfirmAction,
    handleRecalculateForecast,
  } = useCampaignDetails({ campaignId, navigate, t });

  return (
    <div className="campaign-details-page">
      <CampaignDetailsActions
        t={t}
        campaign={campaign}
        canUpdate={canUpdate}
        canDelete={canDelete}
        busyAction={busyAction}
        onBack={() => navigate("/app/campaigns")}
        onConfirm={setConfirmAction}
      />

      {pageError ? (
        <div className="campaign-page-alert error">{pageError}</div>
      ) : null}

      {successMessage ? (
        <div className="campaign-page-alert success">{successMessage}</div>
      ) : null}

      {warningMessage ? (
        <div className="campaign-page-alert warning">{warningMessage}</div>
      ) : null}

      {loading ? (
        <Card>
          <div className="campaign-loading-state">{t("common.loading")}</div>
        </Card>
      ) : campaign ? (
        <div className="campaign-details-stack">
          <CampaignDetailsOverviewCard
            t={t}
            campaign={campaign}
            canUpdate={canUpdate}
            busyAction={busyAction}
            forecastReadiness={forecastReadiness}
            onGoForecasting={() => navigate("/app/forecasting")}
            onRecalculateForecast={handleRecalculateForecast}
          />

          <CampaignInsights result={campaign} />

          <div className="campaign-details-grid">
            <CampaignScheduleCard t={t} campaign={campaign} />
            <CampaignTextSummaryCard t={t} campaign={campaign} />
          </div>

          <CampaignChannelsCard t={t} campaign={campaign} />
          <CampaignProductsCard t={t} campaign={campaign} />
        </div>
      ) : (
        <Card>
          <div className="campaign-loading-state">
            {t("messages.noCampaignFound")}
          </div>
        </Card>
      )}

      <ConfirmActionModal
        isOpen={!!confirmAction}
        onClose={closeConfirmModal}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        confirmVariant={confirmAction === "delete" ? "danger" : "primary"}
        onConfirm={handleConfirmAction}
        isLoading={confirmLoading}
      />
    </div>
  );
};

export default CampaignDetails;