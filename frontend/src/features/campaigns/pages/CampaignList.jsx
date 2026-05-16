import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  CampaignFilters,
  ConfirmActionModal,
} from "../components";

import CampaignEmptyState from "../components/list/CampaignEmptyState";
import CampaignListActions from "../components/list/CampaignListActions";
import CampaignSummaryGrid from "../components/list/CampaignSummaryGrid";
import CampaignsTable from "../components/list/CampaignsTable";

import { useCampaignList } from "../hooks/useCampaignList";

import "./CampaignList.css";

const CampaignList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");
  const { hasPermission } = useAuth();

  const canCreate = hasPermission ? hasPermission("campaigns.create") : true;
  const canUpdate = hasPermission ? hasPermission("campaigns.update") : true;
  const canDelete = hasPermission ? hasPermission("campaigns.delete") : true;

  const {
    filteredCampaigns,
    summary,
    loading,
    pageError,
    busyId,
    busyAction,

    searchValue,
    setSearchValue,
    statusValue,
    setStatusValue,
    typeValue,
    setTypeValue,

    confirmState,
    confirmTitle,
    confirmMessage,
    confirmLabel,
    confirmLoading,

    loadCampaigns,
    openConfirmModal,
    closeConfirmModal,
    handleConfirmAction,
  } = useCampaignList(t);

  const goToNewCampaign = () => navigate("/app/campaigns/new");
  const goToCalendar = () => navigate("/app/campaigns/calendar");
  const goToDetails = (campaignId) => navigate(`/app/campaigns/${campaignId}`);

  return (
    <div className="campaign-list-page">
      <PageHeader
        actions={
          <CampaignListActions
            t={t}
            canCreate={canCreate}
            onCalendar={goToCalendar}
            onNew={goToNewCampaign}
          />
        }
      />

      {pageError ? (
        <div className="campaign-page-alert error">{pageError}</div>
      ) : null}

      <CampaignSummaryGrid t={t} summary={summary} />

      <Card>
        <CampaignFilters
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusValue={statusValue}
          onStatusChange={setStatusValue}
          typeValue={typeValue}
          onTypeChange={setTypeValue}
        />

        {loading ? (
          <div className="campaign-empty-state">{t("common.loading")}</div>
        ) : filteredCampaigns.length ? (
          <CampaignsTable
            t={t}
            campaigns={filteredCampaigns}
            busyId={busyId}
            busyAction={busyAction}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onView={goToDetails}
            onConfirm={openConfirmModal}
          />
        ) : (
          <CampaignEmptyState
            t={t}
            canCreate={canCreate}
            onRetry={loadCampaigns}
            onNew={goToNewCampaign}
          />
        )}
      </Card>

      <ConfirmActionModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirmModal}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        confirmVariant={confirmState.action === "delete" ? "danger" : "primary"}
        onConfirm={handleConfirmAction}
        isLoading={confirmLoading}
      />
    </div>
  );
};

export default CampaignList;