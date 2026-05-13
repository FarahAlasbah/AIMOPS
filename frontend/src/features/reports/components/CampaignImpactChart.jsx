import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import { CHART_COLORS } from "../constants";
import {
  exportCampaignsExcel,
  formatCurrency,
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
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const chartCampaigns = useMemo(() => {
    return [...campaignPerformance]
      .map((campaign) => {
        const budget = getCampaignBudget(campaign);
        const revenue = getCampaignRevenue(campaign);
        const roi = toNumber(getCampaignRoi(campaign), 0);

        return {
          campaign,
          name: getCampaignName(campaign, t("fallback.untitledCampaign")),
          budget,
          revenue,
          roi,
          bubbleSize: Math.max(revenue || budget || 1, 1),
        };
      })
      .sort((a, b) => b.bubbleSize - a.bubbleSize)
      .slice(0, 12);
  }, [campaignPerformance, t]);

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
          text: t("charts.campaignImpact.budget"),
        },
        labels: {
          formatter: (value) => formatCurrency(value, locale),
        },
      },
      yaxis: {
        title: {
          text: t("charts.campaignImpact.roi"),
        },
        labels: {
          formatter: (value) => formatPercent(value, locale),
        },
      },
      tooltip: {
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const point = w.config.series?.[seriesIndex]?.data?.[dataPointIndex];

          return `
            <div class="reports-chart-tooltip">
              <strong>${escapeHtml(point?.name || t("charts.campaignImpact.campaignFallback"))}</strong>
              <span>${escapeHtml(t("charts.campaignImpact.budget"))}: ${escapeHtml(formatCurrency(point?.x || 0, locale))}</span>
              <span>${escapeHtml(t("charts.campaignImpact.roi"))}: ${escapeHtml(formatPercent(point?.y || 0, locale))}</span>
              <span>${escapeHtml(t("charts.campaignImpact.revenue"))}: ${escapeHtml(formatCurrency(point?.revenue || 0, locale))}</span>
            </div>
          `;
        },
      },
    };
  }, [t, locale]);

  return (
    <Card title={t("charts.campaignImpact.title")}>
      <div className="reports-card-action-row">
        <p className="reports-muted">
          {t("charts.campaignImpact.description")}
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

      <div className="reports-chart-box reports-chart-box-xl">
        {loading ? (
          <div className="reports-empty">
            {t("charts.campaignImpact.loading")}
          </div>
        ) : chartCampaigns.length ? (
          <ReactApexChart
            type="bubble"
            height={390}
            options={options}
            series={[
              {
                name: t("charts.campaignImpact.campaigns"),
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
            {t("charts.campaignImpact.empty")}
          </div>
        )}
      </div>
    </Card>
  );
}