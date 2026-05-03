import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  deleteCampaign,
  getCampaignById,
  publishCampaign,
} from "../../../api/campaigns";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  normalizeCampaignResponse,
} from "../utils";
import {
  CampaignInsights,
  CampaignStatusBadge,
  ConfirmActionModal,
} from "../components";
import "./CampaignDetails.css";

const CampaignDetails = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");
  const { hasPermission } = useAuth();

  const canUpdate = hasPermission ? hasPermission("campaigns.update") : true;
  const canDelete = hasPermission ? hasPermission("campaigns.delete") : true;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [confirmAction, setConfirmAction] = useState("");

  const loadCampaign = async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await getCampaignById(campaignId);
      setCampaign(normalizeCampaignResponse(response));
    } catch (error) {
      setPageError(error.message || t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  if (!campaignId) return;
  loadCampaign();
}, [campaignId]);

  const closeConfirmModal = () => {
    if (busyAction) return;
    setConfirmAction("");
  };

  const handlePublish = async () => {
    setBusyAction("publish");

    try {
      await publishCampaign(campaignId);
      setCampaign((prev) => ({
        ...prev,
        status: "active",
      }));
      closeConfirmModal();
    } catch (error) {
      setPageError(error.message || t("messages.publishError"));
    } finally {
      setBusyAction("");
    }
  };

  const handleDelete = async () => {
    setBusyAction("delete");

    try {
      await deleteCampaign(campaignId);
      navigate("/app/campaigns");
    } catch (error) {
      setPageError(error.message || t("messages.deleteError"));
    } finally {
      setBusyAction("");
    }
  };

  const handleConfirmAction = async () => {
    if (confirmAction === "publish") {
      await handlePublish();
      return;
    }

    if (confirmAction === "delete") {
      await handleDelete();
    }
  };

  const breadcrumbs = [
    {
      label: t("list.title"),
      link: true,
      onClick: () => navigate("/app/campaigns"),
    },
    {
      label: campaign?.campaign_name || t("details.title"),
      link: false,
    },
  ];

  const confirmTitle =
    confirmAction === "publish"
      ? t("dialogs.publishTitle")
      : t("dialogs.deleteTitle");

  const confirmMessage =
    confirmAction === "publish"
      ? t("messages.confirmPublish")
      : t("messages.confirmDelete");

  const confirmLabel =
    confirmAction === "publish"
      ? busyAction === "publish"
        ? t("actions.publishing")
        : t("actions.publish")
      : busyAction === "delete"
      ? t("actions.deleting")
      : t("actions.delete");

  return (
    <div className="campaign-details-page">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={campaign?.campaign_name || t("details.title")}
        subtitle={t("details.subtitle")}
        actions={
          <div className="campaign-details-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/app/campaigns")}
            >
              {t("actions.backToCampaigns")}
            </button>

            {canUpdate && campaign?.status === "planned" ? (
              <button
                type="button"
                className="btn-primary"
                disabled={busyAction === "publish"}
                onClick={() => setConfirmAction("publish")}
              >
                {busyAction === "publish"
                  ? t("actions.publishing")
                  : t("actions.publish")}
              </button>
            ) : null}

            {canDelete ? (
              <button
                type="button"
                className="btn-danger"
                disabled={busyAction === "delete"}
                onClick={() => setConfirmAction("delete")}
              >
                {busyAction === "delete"
                  ? t("actions.deleting")
                  : t("actions.delete")}
              </button>
            ) : null}
          </div>
        }
      />

      {pageError ? <div className="campaign-page-alert error">{pageError}</div> : null}

      {loading ? (
        <Card>
          <div className="campaign-loading-state">{t("common.loading")}</div>
        </Card>
      ) : campaign ? (
        <div className="campaign-details-stack">
          <Card>
            <div className="campaign-details-top">
              <div>
                <div className="campaign-details-status-row">
                  <CampaignStatusBadge status={campaign.status} />
                </div>

                <h2>{campaign.campaign_name}</h2>
                <p>{t(`types.${campaign.campaign_type}`)}</p>
              </div>
            </div>

            <div className="campaign-metrics-grid">
              <div className="metric-card">
                <span>{t("fields.budget")}</span>
                <strong>{formatCurrency(campaign.budget)}</strong>
              </div>

              <div className="metric-card">
                <span>{t("details.duration")}</span>
                <strong>{campaign.duration_days || "-"}</strong>
              </div>

              <div className="metric-card">
                <span>{t("details.predictedRoi")}</span>
                <strong>{formatPercent(campaign.predicted_roi)}</strong>
              </div>

              <div className="metric-card">
                <span>{t("details.additionalRevenue")}</span>
                <strong>{formatCurrency(campaign.forecast_additional_revenue)}</strong>
              </div>
            </div>
          </Card>
<CampaignInsights result={campaign} />

          <div className="campaign-details-grid">
            <Card>
              <div className="details-section">
                <h3>{t("details.schedule")}</h3>

                <div className="details-list">
                  <div>
                    <span>{t("fields.startDate")}</span>
                    <strong>{formatDate(campaign.start_date)}</strong>
                  </div>
                  <div>
                    <span>{t("fields.endDate")}</span>
                    <strong>{formatDate(campaign.end_date)}</strong>
                  </div>
                  <div>
                    <span>{t("details.createdAt")}</span>
                    <strong>{formatDate(campaign.created_at)}</strong>
                  </div>
                  <div>
                    <span>{t("details.productCount")}</span>
                    <strong>{campaign.product_count ?? campaign.products?.length ?? 0}</strong>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="details-section">
                <h3>{t("details.summary")}</h3>

                <div className="details-text-block">
                  <h4>{t("fields.description")}</h4>
                  <p>{campaign.description || "-"}</p>
                </div>

                <div className="details-text-block">
                  <h4>{t("fields.notes")}</h4>
                  <p>{campaign.notes || "-"}</p>
                </div>

                <div className="details-text-block">
                  <h4>{t("details.targetAudience")}</h4>
                  <p>{campaign.target_audience || "-"}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="details-section">
              <h3>{t("details.channels")}</h3>

              <div className="details-chip-wrap">
                {campaign.channels?.length ? (
                  campaign.channels.map((channel) => (
                    <span key={channel.channel_name} className="details-chip">
                      {t(`channels.${channel.channel_name}`, {
                        defaultValue: channel.channel_name,
                      })}
                    </span>
                  ))
                ) : (
                  <p className="details-empty-text">-</p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="details-section">
              <h3>{t("details.products")}</h3>

              {campaign.products?.length ? (
                <div className="products-table-wrapper">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>{t("details.productName")}</th>
                        <th>{t("details.category")}</th>
                        <th>{t("fields.discountPct")}</th>
                        <th>{t("fields.targetQuantity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaign.products.map((product) => (
                        <tr key={product.product_id}>
                          <td>{product.product_name}</td>
                          <td>{product.category || "-"}</td>
                          <td>{product.discount_pct ?? "-"}</td>
                          <td>{product.target_quantity ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="details-empty-text">-</p>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="campaign-loading-state">{t("messages.noCampaignFound")}</div>
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
        isLoading={
          (confirmAction === "publish" && busyAction === "publish") ||
          (confirmAction === "delete" && busyAction === "delete")
        }
      />
    </div>
  );
};

export default CampaignDetails;