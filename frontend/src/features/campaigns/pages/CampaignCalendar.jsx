import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, PageHeader, FormCalendar } from "../../../shared/components";
import { getCampaignCalendar } from "../../../api/campaigns";
import { formatDate, getDefaultCalendarRange } from "../utils";
import { CampaignStatusBadge } from "../components";

const CampaignCalendar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");

  const defaultRange = getDefaultCalendarRange();

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadCalendar = async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await getCampaignCalendar({ startDate, endDate });
      setCampaigns(Array.isArray(response?.campaigns) ? response.campaigns : []);
    } catch (error) {
      setPageError(error.message || t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    loadCalendar();
  }, [startDate, endDate]);

  return (
    <div className="campaign-list-page">
      <PageHeader
        title={t("calendar.title")}
        subtitle={t("calendar.subtitle")}
        actions={
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate("/app/campaigns")}
          >
            {t("actions.backToCampaigns")}
          </button>
        }
      />

      {pageError ? <div className="campaign-page-alert error">{pageError}</div> : null}

      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <FormCalendar
            label={t("fields.startDate")}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <FormCalendar
            label={t("fields.endDate")}
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="campaign-empty-state">{t("common.loading")}</div>
        ) : campaigns.length ? (
          <div className="campaigns-table-wrapper">
            <table className="campaigns-table">
              <thead>
                <tr>
                  <th>{t("list.headers.name")}</th>
                  <th>{t("list.headers.type")}</th>
                  <th>{t("list.headers.status")}</th>
                  <th>{t("list.headers.dates")}</th>
                  <th>{t("list.headers.products")}</th>
                  <th>{t("list.headers.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.campaign_id}>
                    <td>{campaign.campaign_name}</td>
                    <td>{t(`types.${campaign.campaign_type}`)}</td>
                    <td>
                      <CampaignStatusBadge status={campaign.status} />
                    </td>
                    <td>
                      <div className="campaign-date-range">
                        <span>{formatDate(campaign.start_date)}</span>
                        <span>→</span>
                        <span>{formatDate(campaign.end_date)}</span>
                      </div>
                    </td>
                    <td>{campaign.product_count ?? campaign.products?.length ?? 0}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() =>
                          navigate(`/app/campaigns/${campaign.campaign_id}`)
                        }
                      >
                        {t("actions.view")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="campaign-empty-state">{t("calendar.noCampaigns")}</div>
        )}
      </Card>
    </div>
  );
};

export default CampaignCalendar;