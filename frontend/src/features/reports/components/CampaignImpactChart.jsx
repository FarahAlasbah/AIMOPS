import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Download } from "lucide-react";

import { Card } from "../../../shared/components";
import { CHART_COLORS } from "../constants";
import {
  exportCampaignsExcel,
  formatCurrency,
  formatNumber,
  formatPercent,
  getCampaignBudget,
  getCampaignName,
  getCampaignRevenue,
  getCampaignRoi,
  toNumber,
} from "../utils/reportUtils";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function CampaignImpactChart({ loading, campaignPerformance }) {
  const chartCampaigns = useMemo(() => {
    return [...campaignPerformance]
      .map((campaign) => {
        const budget = getCampaignBudget(campaign);
        const revenue = getCampaignRevenue(campaign);
        const roi = toNumber(getCampaignRoi(campaign), 0);

        return {
          campaign,
          name: getCampaignName(campaign),
          budget,
          revenue,
          roi,
          bubbleSize: Math.max(revenue || budget || 1, 1),
        };
      })
      .sort((a, b) => b.bubbleSize - a.bubbleSize)
      .slice(0, 12);
  }, [campaignPerformance]);

  const options = useMemo(() => {
    return {
      chart: {
        type: "bubble",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
        animations: {
          enabled: true,
          speed: 650,
        },
      },
      colors: [CHART_COLORS.violet],
      dataLabels: {
        enabled: false,
      },
      fill: {
        opacity: 0.72,
      },
      stroke: {
        width: 2,
        colors: ["#ffffff"],
      },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      plotOptions: {
        bubble: {
          minBubbleRadius: 8,
          maxBubbleRadius: 34,
        },
      },
      xaxis: {
        title: {
          text: "Budget",
        },
        labels: {
          formatter: (value) => formatCurrency(value),
        },
      },
      yaxis: {
        title: {
          text: "ROI",
        },
        labels: {
          formatter: (value) => formatPercent(value),
        },
      },
      tooltip: {
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const point = w.config.series?.[seriesIndex]?.data?.[dataPointIndex];

          return `
            <div class="reports-chart-tooltip">
              <strong>${escapeHtml(point?.name || "Campaign")}</strong>
              <span>Budget: ${escapeHtml(formatCurrency(point?.x || 0))}</span>
              <span>ROI: ${escapeHtml(formatPercent(point?.y || 0))}</span>
              <span>Revenue: ${escapeHtml(formatCurrency(point?.revenue || 0))}</span>
            </div>
          `;
        },
      },
    };
  }, []);

  return (
    <Card title="Campaign portfolio">
      <div className="reports-card-action-row">
        <p className="reports-muted">
          Bubble chart compares budget, ROI, and revenue in one view.
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

      <div className="reports-chart-box reports-chart-box-xl">
        {loading ? (
          <div className="reports-empty">Loading chart...</div>
        ) : chartCampaigns.length ? (
          <ReactApexChart
            type="bubble"
            height={390}
            options={options}
            series={[
              {
                name: "Campaigns",
                data: chartCampaigns.map((item) => ({
                  x: item.budget,
                  y: item.roi,
                  z: item.bubbleSize,
                  name: item.name,
                  revenue: item.revenue,
                })),
              },
            ]}
          />
        ) : (
          <div className="reports-empty">
            No campaign performance data available.
          </div>
        )}
      </div>
    </Card>
  );
}