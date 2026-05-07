import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  deleteCampaign,
  getCampaigns,
  publishCampaign,
} from "../../../api/campaigns";
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "../utils";
import {
  CampaignFilters,
  CampaignStatusBadge,
  ConfirmActionModal,
} from "../components";
import "./CampaignList.css";

const CampaignList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");
  const { hasPermission } = useAuth();

  const canCreate = hasPermission ? hasPermission("campaigns.create") : true;
  const canUpdate = hasPermission ? hasPermission("campaigns.update") : true;
  const canDelete = hasPermission ? hasPermission("campaigns.delete") : true;

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [busyAction, setBusyAction] = useState("");

  const [searchValue, setSearchValue] = useState("");
  const [statusValue, setStatusValue] = useState("all");
  const [typeValue, setTypeValue] = useState("all");

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    action: "",
    campaignId: null,
  });

  const loadCampaigns = async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await getCampaigns();
      setCampaigns(Array.isArray(response?.campaigns) ? response.campaigns : []);
    } catch (error) {
      setPageError(error.message || t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const filteredCampaigns = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesSearch =
        !query ||
        campaign.campaign_name?.toLowerCase().includes(query) ||
        campaign.campaign_type?.toLowerCase().includes(query) ||
        campaign.status?.toLowerCase().includes(query);

      const matchesStatus =
        statusValue === "all" || campaign.status === statusValue;

      const matchesType =
        typeValue === "all" || campaign.campaign_type === typeValue;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [campaigns, searchValue, statusValue, typeValue]);

  const summary = useMemo(
    () => ({
      total: campaigns.length,
      active: campaigns.filter((item) => item.status === "active").length,
      planned: campaigns.filter((item) => item.status === "planned").length,
      completed: campaigns.filter((item) => item.status === "completed").length,
    }),
    [campaigns]
  );

  const closeConfirmModal = () => {
    if (busyAction) return;

    setConfirmState({
      isOpen: false,
      action: "",
      campaignId: null,
    });
  };

  const handlePublish = async (campaignId) => {
    setBusyId(campaignId);
    setBusyAction("publish");

    try {
      await publishCampaign(campaignId);

      setCampaigns((prev) =>
        prev.map((item) =>
          item.campaign_id === campaignId
            ? { ...item, status: "active" }
            : item
        )
      );

      closeConfirmModal();
    } catch (error) {
      setPageError(error.message || t("messages.publishError"));
    } finally {
      setBusyId(null);
      setBusyAction("");
    }
  };

  const handleDelete = async (campaignId) => {
    setBusyId(campaignId);
    setBusyAction("delete");

    try {
      await deleteCampaign(campaignId);

      setCampaigns((prev) =>
        prev.filter((item) => item.campaign_id !== campaignId)
      );

      closeConfirmModal();
    } catch (error) {
      setPageError(error.message || t("messages.deleteError"));
    } finally {
      setBusyId(null);
      setBusyAction("");
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState.campaignId) return;

    if (confirmState.action === "publish") {
      await handlePublish(confirmState.campaignId);
      return;
    }

    if (confirmState.action === "delete") {
      await handleDelete(confirmState.campaignId);
    }
  };

  const confirmTitle =
    confirmState.action === "publish"
      ? t("dialogs.publishTitle")
      : t("dialogs.deleteTitle");

  const confirmMessage =
    confirmState.action === "publish"
      ? t("messages.confirmPublish")
      : t("messages.confirmDelete");

  const confirmLabel =
    confirmState.action === "publish"
      ? busyAction === "publish" && busyId === confirmState.campaignId
        ? t("actions.publishing")
        : t("actions.publish")
      : busyAction === "delete" && busyId === confirmState.campaignId
      ? t("actions.deleting")
      : t("actions.delete");

  return (
    <div className="campaign-list-page">
      
          <div className="campaign-list-header-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/app/campaigns/calendar")}
            >
              {t("actions.calendarView")}
            </button>

            {canCreate ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate("/app/campaigns/new")}
              >
                {t("actions.newCampaign")}
              </button>
            ) : null}
          </div>
       

      {pageError ? <div className="campaign-page-alert error">{pageError}</div> : null}

      <div className="campaign-summary-grid">
        <Card>
          <div className="campaign-summary-card">
            <span>{t("summary.total")}</span>
            <strong>{summary.total}</strong>
          </div>
        </Card>

        <Card>
          <div className="campaign-summary-card">
            <span>{t("summary.active")}</span>
            <strong>{summary.active}</strong>
          </div>
        </Card>

        <Card>
          <div className="campaign-summary-card">
            <span>{t("summary.planned")}</span>
            <strong>{summary.planned}</strong>
          </div>
        </Card>

        <Card>
          <div className="campaign-summary-card">
            <span>{t("summary.completed")}</span>
            <strong>{summary.completed}</strong>
          </div>
        </Card>
      </div>

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
          <div className="campaigns-table-wrapper">
            <table className="campaigns-table">
              <thead>
                <tr>
                  <th>{t("list.headers.name")}</th>
                  <th>{t("list.headers.type")}</th>
                  <th>{t("list.headers.status")}</th>
                  <th>{t("list.headers.budget")}</th>
                  <th>{t("list.headers.dates")}</th>
                  <th>{t("list.headers.products")}</th>
                  <th>{t("list.headers.uplift")}</th>
                  <th>{t("list.headers.actions")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredCampaigns.map((campaign) => {
                  const isBusy = busyId === campaign.campaign_id;

                  return (
                    <tr key={campaign.campaign_id}>
                      <td className="campaign-name-cell">
                        <button
                          type="button"
                          className="campaign-link-btn"
                          onClick={() =>
                            navigate(`/app/campaigns/${campaign.campaign_id}`)
                          }
                        >
                          {campaign.campaign_name}
                        </button>
                      </td>

                      <td>{t(`types.${campaign.campaign_type}`)}</td>

                      <td>
                        <CampaignStatusBadge status={campaign.status} />
                      </td>

                      <td>{formatCurrency(campaign.budget)}</td>

                      <td>
                        <div className="campaign-date-range">
                          <span>{formatDate(campaign.start_date)}</span>
                          <span>→</span>
                          <span>{formatDate(campaign.end_date)}</span>
                        </div>
                      </td>

                      <td>{campaign.product_count}</td>

                      <td>{formatPercent(campaign.forecast_uplift_pct)}</td>

                      <td>
                        <div className="campaign-actions">
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() =>
                              navigate(`/app/campaigns/${campaign.campaign_id}`)
                            }
                          >
                            {t("actions.view")}
                          </button>

                          {canUpdate && campaign.status === "planned" ? (
                            <button
                              type="button"
                              className="btn-table-action"
                              disabled={isBusy}
                              onClick={() =>
                                setConfirmState({
                                  isOpen: true,
                                  action: "publish",
                                  campaignId: campaign.campaign_id,
                                })
                              }
                            >
                              {isBusy && busyAction === "publish"
                                ? t("actions.publishing")
                                : t("actions.publish")}
                            </button>
                          ) : null}

                          {canDelete ? (
                            <button
                              type="button"
                              className="btn-table-action danger"
                              disabled={isBusy}
                              onClick={() =>
                                setConfirmState({
                                  isOpen: true,
                                  action: "delete",
                                  campaignId: campaign.campaign_id,
                                })
                              }
                            >
                              {isBusy && busyAction === "delete"
                                ? t("actions.deleting")
                                : t("actions.delete")}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="campaign-empty-state">
            <p>{t("messages.noCampaigns")}</p>

            <div className="campaign-empty-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={loadCampaigns}
              >
                {t("actions.retry")}
              </button>

              {canCreate ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate("/app/campaigns/new")}
                >
                  {t("actions.newCampaign")}
                </button>
              ) : null}
            </div>
          </div>
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
        isLoading={
          (confirmState.action === "publish" &&
            busyAction === "publish" &&
            busyId === confirmState.campaignId) ||
          (confirmState.action === "delete" &&
            busyAction === "delete" &&
            busyId === confirmState.campaignId)
        }
      />
    </div>
  );
};

export default CampaignList;