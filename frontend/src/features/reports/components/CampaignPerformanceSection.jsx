import { CalendarDays, Download } from "lucide-react";

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
  return (
    <Card title="Campaign performance">
      <div className="reports-card-action-row">
        <p className="reports-muted">
          Campaign budget, ROI, and generated or forecasted revenue.
        </p>

        <button
          type="button"
          className="reports-small-btn"
          onClick={() => exportCampaignsExcel(campaignPerformance)}
          disabled={!campaignPerformance.length}
        >
          <Download size={15} />
          Excel
        </button>
      </div>

      <div className="reports-campaign-summary">
        <div>
          <span>Campaigns</span>
          <strong>{formatNumber(campaignTotals.count, 0)}</strong>
        </div>

        <div>
          <span>Active</span>
          <strong>{formatNumber(campaignTotals.activeCount, 0)}</strong>
        </div>

        <div>
          <span>Total budget</span>
          <strong>{formatCurrency(campaignTotals.totalBudget)}</strong>
        </div>

        <div>
          <span>Expected revenue</span>
          <strong>{formatCurrency(campaignTotals.totalRevenue)}</strong>
        </div>

        <div>
          <span>Average ROI</span>
          <strong>
            {campaignTotals.averageRoi == null
              ? "-"
              : formatPercent(campaignTotals.averageRoi)}
          </strong>
        </div>
      </div>

      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Type</th>
              <th>Status</th>
              <th>Budget</th>
              <th>ROI</th>
              <th>Revenue</th>
              <th>Dates</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="reports-table-empty">
                  Loading campaigns...
                </td>
              </tr>
            ) : campaignPerformance.length ? (
              campaignPerformance.slice(0, 10).map((campaign, index) => {
                const status = getCampaignStatus(campaign);

                return (
                  <tr
                    key={
                      getCampaignId(campaign) ||
                      `${getCampaignName(campaign)}-${index}`
                    }
                  >
                    <td>
                      <div className="reports-table-title">
                        {getCampaignName(campaign)}
                      </div>
                    </td>
                    <td>{getCampaignType(campaign)}</td>
                    <td>
                      <span className={`reports-status-pill ${status}`}>
                        {formatStatus(status)}
                      </span>
                    </td>
                    <td>{formatCurrency(getCampaignBudget(campaign))}</td>
                    <td>{formatPercent(getCampaignRoi(campaign))}</td>
                    <td>{formatCurrency(getCampaignRevenue(campaign))}</td>
                    <td>
                      <div className="reports-date-range">
                        <CalendarDays size={14} />
                        <span>
                          {formatDate(getCampaignStartDate(campaign))} →{" "}
                          {formatDate(getCampaignEndDate(campaign))}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="reports-table-empty">
                  No campaign performance data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}