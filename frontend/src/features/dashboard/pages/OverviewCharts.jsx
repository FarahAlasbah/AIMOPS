import { useTranslation } from "react-i18next";
import ReactApexChart from "react-apexcharts";
import { Card } from "../../../shared/components";

export default function OverviewCharts({
  loading,
  // uploads over time
  uploadsOverTime,
  uploadsOverTimeOptions,
  // uploads by status
  uploads,
  uploadsByStatusSeries,
  uploadsByStatusOptions,
  // product revenue
  productRevenueData,
  productRevenueRankOptions,
  // campaign bubble
  campaignBubbleData,
  campaignBubbleOptions,
  // campaign status donut
  campaignStats,
  campaignStatusSeries,
  campaignStatusOptions,
}) {
  const { t } = useTranslation("dashboard");

  return (
    <>
      {/* Row 1: Uploads over time */}
      <div className="overview-full-grid">
        <Card title={t("charts.uploadsOverTime")}>
          <div className="chart-shell large">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : uploadsOverTime.values.length ? (
              <ReactApexChart
                type="area"
                height={330}
                options={uploadsOverTimeOptions}
                series={[
                  {
                    name: t("charts.uploadsDatasetLabel"),
                    data: uploadsOverTime.values,
                  },
                ]}
              />
            ) : (
              <div className="chart-empty">{t("charts.noUploads")}</div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Product revenue + Campaign portfolio */}
      <div className="overview-secondary-grid">
        <Card title={t("charts.productRevenueRank")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : productRevenueData.length ? (
              <ReactApexChart
                type="bar"
                height={315}
                options={productRevenueRankOptions}
                series={[
                  {
                    name: t("charts.revenueDatasetLabel"),
                    data: productRevenueData.map((item) => item.revenue),
                  },
                ]}
              />
            ) : (
              <div className="chart-empty">{t("charts.noProducts")}</div>
            )}
          </div>
        </Card>

        <Card title={t("charts.campaignPortfolio")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : campaignBubbleData.length ? (
              <ReactApexChart
                type="bubble"
                height={315}
                options={campaignBubbleOptions}
                series={[
                  {
                    name: t("charts.campaignsDatasetLabel"),
                    data: campaignBubbleData.map((item) => ({
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
              <div className="chart-empty">{t("charts.noCampaigns")}</div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Uploads by status + Campaign status */}
      <div className="overview-secondary-grid">
        <Card title={t("charts.uploadsByStatus")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : uploads.length ? (
              <ReactApexChart
                type="donut"
                height={315}
                options={uploadsByStatusOptions}
                series={uploadsByStatusSeries}
              />
            ) : (
              <div className="chart-empty">{t("charts.noUploads")}</div>
            )}
          </div>
        </Card>

        <Card title={t("charts.campaignStatus")}>
          <div className="chart-shell medium">
            {loading ? (
              <div className="chart-empty">{t("charts.loading")}</div>
            ) : campaignStats.total > 0 ? (
              <ReactApexChart
                type="donut"
                height={315}
                options={campaignStatusOptions}
                series={campaignStatusSeries}
              />
            ) : (
              <div className="chart-empty">{t("charts.noCampaigns")}</div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}