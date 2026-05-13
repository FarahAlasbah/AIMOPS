import { CalendarDays, Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import {
  exportCampaignsExcel,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatStatus,
  getCampaignBudget,
  getCampaignEndDate,
  getCampaignId,
  getCampaignName,
  getCampaignRevenue,
  getCampaignRoi,
  getCampaignStartDate,
  getCampaignStatus,
  getCampaignType,
} from "../utils/reportUtils";

export function CampaignPerformanceSection({
  loading,
  campaignPerformance,
  campaignTotals,
}) {
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  return (
    <Card title={t("campaignPerformance.title")}>
      <div className="reports-card-action-row">
        <p className="reports-muted">
          {t("campaignPerformance.description")}
        </p>

        <button
          type="button"
          className="reports-small-btn"
          onClick={() => exportCampaignsExcel(campaignPerformance, t)}
          disabled={!campaignPerformance.length}
        >
          <Download size={15} />
          {t("actions.excel")}
        </button>
      </div>

      <div className="reports-campaign-summary">
        <div>
          <span>{t("campaignPerformance.summary.campaigns")}</span>
          <strong>{formatNumber(campaignTotals.count, 0, locale)}</strong>
        </div>

        <div>
          <span>{t("campaignPerformance.summary.active")}</span>
          <strong>{formatNumber(campaignTotals.activeCount, 0, locale)}</strong>
        </div>

        <div>
          <span>{t("campaignPerformance.summary.totalBudget")}</span>
          <strong>{formatCurrency(campaignTotals.totalBudget, locale)}</strong>
        </div>

        <div>
          <span>{t("campaignPerformance.summary.expectedRevenue")}</span>
          <strong>{formatCurrency(campaignTotals.totalRevenue, locale)}</strong>
        </div>

        <div>
          <span>{t("campaignPerformance.summary.averageRoi")}</span>
          <strong>
            {campaignTotals.averageRoi == null
              ? "-"
              : formatPercent(campaignTotals.averageRoi, locale)}
          </strong>
        </div>
      </div>

      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>{t("campaignPerformance.table.campaign")}</th>
              <th>{t("campaignPerformance.table.type")}</th>
              <th>{t("campaignPerformance.table.status")}</th>
              <th>{t("campaignPerformance.table.budget")}</th>
              <th>{t("campaignPerformance.table.roi")}</th>
              <th>{t("campaignPerformance.table.revenue")}</th>
              <th>{t("campaignPerformance.table.dates")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="reports-table-empty">
                  {t("campaignPerformance.table.loading")}
                </td>
              </tr>
            ) : campaignPerformance.length ? (
              campaignPerformance.slice(0, 10).map((campaign, index) => {
                const status = getCampaignStatus(campaign);

                return (
                  <tr
                    key={
                      getCampaignId(campaign) ||
                      `${getCampaignName(campaign, t("fallback.untitledCampaign"))}-${index}`
                    }
                  >
                    <td>
                      <div className="reports-table-title">
                        {getCampaignName(campaign, t("fallback.untitledCampaign"))}
                      </div>
                    </td>
                    <td>{getCampaignType(campaign, t("fallback.unknownType"))}</td>
                    <td>
                      <span className={`reports-status-pill ${status}`}>
                        {formatStatus(status, t)}
                      </span>
                    </td>
                    <td>{formatCurrency(getCampaignBudget(campaign), locale)}</td>
                    <td>{formatPercent(getCampaignRoi(campaign), locale)}</td>
                    <td>{formatCurrency(getCampaignRevenue(campaign), locale)}</td>
                    <td>
                      <div className="reports-date-range">
                        <CalendarDays size={14} />
                        <span>
                          {formatDate(getCampaignStartDate(campaign), locale)} →{" "}
                          {formatDate(getCampaignEndDate(campaign), locale)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="reports-table-empty">
                  {t("campaignPerformance.table.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}