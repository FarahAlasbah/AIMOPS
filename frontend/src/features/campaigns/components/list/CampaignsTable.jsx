import { formatCurrency, formatDate, formatPercent } from "../../utils";
import CampaignStatusBadge from "../CampaignStatusBadge";

export default function CampaignsTable({
  t,
  campaigns,
  busyId,
  busyAction,
  canUpdate,
  canDelete,
  onView,
  onConfirm,
}) {
  return (
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
          {campaigns.map((campaign) => {
            const isBusy = busyId === campaign.campaign_id;

            return (
              <tr key={campaign.campaign_id}>
                <td className="campaign-name-cell">
                  <button
                    type="button"
                    className="campaign-link-btn"
                    onClick={() => onView(campaign.campaign_id)}
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
                      onClick={() => onView(campaign.campaign_id)}
                    >
                      {t("actions.view")}
                    </button>

                    {canUpdate && campaign.status === "planned" ? (
                      <button
                        type="button"
                        className="btn-table-action"
                        disabled={isBusy}
                        onClick={() =>
                          onConfirm("publish", campaign.campaign_id)
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
                          onConfirm("delete", campaign.campaign_id)
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
  );
}