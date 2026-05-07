import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import {
  Activity,
  CalendarDays,
  Download,
  FileText,
  Megaphone,
  Package,
  Printer,
  RefreshCcw,
  TrendingUp,
  Upload,
} from "lucide-react";

import { Card, FormSelect, PageHeader } from "../../../shared/components";
import { getDashboardReport } from "../../../api/reports";

import "./ReportsPage.css";

const ALL_TIME_START_DATE = "2024-01-01";

const PERIOD_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" },
  { value: "365", label: "Last year" },
  { value: "all", label: "All time" },
];

const FORECAST_STATUS_ORDER = ["ready", "training", "failed", "idle"];
const UPLOAD_STATUS_ORDER = ["processed", "mapping", "pending", "failed"];

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateRangeFromPeriod(period) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  if (period === "all") {
    return {
      startDate: ALL_TIME_START_DATE,
      endDate: toDateInputValue(end),
    };
  }

  const days = Number(period);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function normalizeSelectValue(value) {
  if (value?.target?.value) return value.target.value;
  if (value?.value) return value.value;
  return value;
}

function normalizeStatus(value) {
  return String(value || "unknown").toLowerCase();
}

function formatNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(number);
}

function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "$0";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(number)}%`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function shortDayLabel(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function downloadCsv(filename, rows) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const csv = safeRows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          const escaped = value.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function getCampaignName(campaign) {
  return campaign?.campaign_name || campaign?.name || "Untitled campaign";
}

function getCampaignType(campaign) {
  return campaign?.campaign_type || campaign?.type || "-";
}

function getCampaignStatus(campaign) {
  return normalizeStatus(campaign?.status);
}

function getCampaignBudget(campaign) {
  return Number(campaign?.budget ?? campaign?.total_budget ?? 0) || 0;
}

function getCampaignRoi(campaign) {
  return campaign?.predicted_roi ?? campaign?.estimated_roi ?? campaign?.roi ?? null;
}

function getCampaignRevenue(campaign) {
  return (
    Number(
      campaign?.forecast_additional_revenue ??
        campaign?.additional_revenue ??
        campaign?.revenue ??
        campaign?.total_revenue ??
        0
    ) || 0
  );
}

function ReportsSkeletonCard() {
  return (
    <div className="reports-stat-card reports-skeleton-card">
      <div className="reports-skeleton reports-skeleton-title" />
      <div className="reports-skeleton reports-skeleton-value" />
      <div className="reports-skeleton reports-skeleton-line" />
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("90");
  const [dateRange, setDateRange] = useState(() => getDateRangeFromPeriod("90"));

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [report, setReport] = useState(null);

  const loadReports = async (range = dateRange) => {
    setLoading(true);
    setPageError("");

    try {
      const data = await getDashboardReport({
        startDate: range.startDate,
        endDate: range.endDate,
      });

      setReport(data || null);
    } catch (error) {
      setPageError(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate, dateRange.endDate]);

  const summary = report?.summary || {};
  const salesTrend = Array.isArray(report?.sales_trend) ? report.sales_trend : [];
  const topProducts = Array.isArray(report?.top_products) ? report.top_products : [];
  const campaignPerformance = Array.isArray(report?.campaign_performance)
    ? report.campaign_performance
    : [];
  const forecastHealth = report?.forecast_health || {};
  const uploadActivity = report?.upload_activity || {};

  const handlePeriodChange = (nextValue) => {
    const value = normalizeSelectValue(nextValue);
    setPeriod(value);
    setDateRange(getDateRangeFromPeriod(value));
  };

  const reportCards = useMemo(() => {
    return [
      {
        label: "Total revenue",
        value: formatCurrency(summary.total_revenue),
        helper: `${formatNumber(summary.average_daily_revenue)} average daily revenue`,
        icon: TrendingUp,
        tone: "blue",
      },
      {
        label: "Quantity sold",
        value: formatNumber(summary.total_quantity_sold),
        helper: `${formatNumber(summary.sales_record_count)} sales records`,
        icon: Package,
        tone: "indigo",
      },
      {
        label: "Products sold",
        value: formatNumber(summary.products_sold_count),
        helper: "Unique products with sales",
        icon: Package,
        tone: "emerald",
      },
      {
        label: "Campaigns",
        value: formatNumber(summary.campaign_count),
        helper: `${formatNumber(summary.active_campaign_count)} active campaigns`,
        icon: Megaphone,
        tone: "violet",
      },
      {
        label: "Forecast models",
        value: formatNumber(summary.forecast_models_total),
        helper: `${formatNumber(summary.forecast_models_ready)} ready models`,
        icon: Activity,
        tone: "blue",
      },
      {
        label: "Uploads",
        value: formatNumber(summary.uploads_count),
        helper: `${formatNumber(summary.processed_uploads_count)} processed uploads`,
        icon: Upload,
        tone: "amber",
      },
    ];
  }, [summary]);

  const salesTrendChartOptions = useMemo(() => {
    return {
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.25,
          opacityTo: 0.04,
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: salesTrend.map((item) => shortDayLabel(item.period)),
      },
      yaxis: {
        labels: {
          formatter: (value) => formatNumber(value, 0),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatCurrency(value),
        },
      },
    };
  }, [salesTrend]);

  const quantityTrendChartOptions = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      plotOptions: {
        bar: {
          borderRadius: 7,
          columnWidth: "45%",
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: salesTrend.map((item) => shortDayLabel(item.period)),
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (value) => formatNumber(value, 0),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => `${formatNumber(value)} units`,
        },
      },
    };
  }, [salesTrend]);

  const topProductChartOptions = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 8,
          barHeight: "52%",
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: topProducts.map((product) => product.product_name || "Unnamed product"),
        labels: {
          formatter: (value) => formatNumber(value, 0),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatCurrency(value),
        },
      },
    };
  }, [topProducts]);

  const forecastChartOptions = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "42%",
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: ["Ready", "Training", "Failed", "Not started"],
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (value) => formatNumber(value, 0),
        },
      },
    };
  }, []);

  const uploadChartOptions = useMemo(() => {
    return {
      chart: {
        type: "donut",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      labels: ["Processed", "Mapping", "Pending", "Failed"],
      dataLabels: { enabled: false },
      legend: {
        position: "bottom",
      },
      stroke: {
        width: 0,
      },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Uploads",
                formatter: () => formatNumber(uploadActivity.total),
              },
            },
          },
        },
      },
    };
  }, [uploadActivity.total]);

  const campaignTotals = useMemo(() => {
    let totalBudget = 0;
    let totalRevenue = 0;
    let totalRoi = 0;
    let roiCount = 0;

    campaignPerformance.forEach((campaign) => {
      totalBudget += getCampaignBudget(campaign);
      totalRevenue += getCampaignRevenue(campaign);

      const roi = Number(getCampaignRoi(campaign));
      if (Number.isFinite(roi)) {
        totalRoi += roi;
        roiCount += 1;
      }
    });

    return {
      count: campaignPerformance.length,
      totalBudget,
      totalRevenue,
      averageRoi: roiCount > 0 ? totalRoi / roiCount : null,
    };
  }, [campaignPerformance]);

  const handleExportProducts = () => {
    const rows = [
      [
        "Product",
        "Category",
        "Revenue",
        "Quantity sold",
        "Sales records",
        "Average daily quantity",
        "Last sale",
        "Forecast status",
        "Forecast next 30 days quantity",
        "Forecast next 30 days revenue",
      ],
      ...topProducts.map((product) => [
        product.product_name || "",
        product.category || "",
        product.total_revenue ?? "",
        product.total_quantity_sold ?? "",
        product.sales_record_count ?? "",
        product.average_daily_quantity ?? "",
        product.last_sale_date || "",
        product.forecast_status || "",
        product.forecast_next_30_days_quantity ?? "",
        product.forecast_next_30_days_revenue ?? "",
      ]),
    ];

    downloadCsv("aimops-top-products-report.csv", rows);
  };

  const handleExportCampaigns = () => {
    const rows = [
      [
        "Campaign",
        "Type",
        "Status",
        "Budget",
        "ROI",
        "Additional revenue",
        "Start date",
        "End date",
      ],
      ...campaignPerformance.map((campaign) => [
        getCampaignName(campaign),
        getCampaignType(campaign),
        getCampaignStatus(campaign),
        getCampaignBudget(campaign),
        getCampaignRoi(campaign) ?? "",
        getCampaignRevenue(campaign),
        campaign?.start_date || "",
        campaign?.end_date || "",
      ]),
    ];

    downloadCsv("aimops-campaign-performance-report.csv", rows);
  };

  return (
    <div className="reports-page">
      <PageHeader
        title="Reports"
        subtitle="Business performance, sales trends, products, campaigns, forecasts, and uploads."
        actions={
          <div className="reports-header-actions">
            <button
              type="button"
              className="reports-btn reports-btn-secondary"
              onClick={() => loadReports(dateRange)}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>

            <button
              type="button"
              className="reports-btn reports-btn-secondary"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        }
      />

      {pageError ? (
        <div className="reports-alert reports-alert-error">{pageError}</div>
      ) : null}

      <Card>
        <div className="reports-toolbar">
          <div>
            <div className="reports-toolbar-title">Report period</div>
            <p>
              Data is loaded from the backend reports dashboard endpoint using the selected
              date range.
            </p>
          </div>

          <div className="reports-filter-group">
            <div className="reports-filter-item">
              <span>Preset</span>
              <FormSelect
                value={period}
                onChange={handlePeriodChange}
                options={PERIOD_OPTIONS}
              />
            </div>

            <div className="reports-date-pill">
              <CalendarDays size={15} />
              <span>
                {formatDate(report?.date_range?.start_date || dateRange.startDate)} →{" "}
                {formatDate(report?.date_range?.end_date || dateRange.endDate)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="reports-stat-grid">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <ReportsSkeletonCard key={index} />
            ))
          : reportCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={`reports-stat-card tone-${item.tone}`}
                >
                  <div className="reports-stat-top">
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>

                    <div className="reports-stat-icon">
                      <Icon size={20} />
                    </div>
                  </div>

                  <p>{item.helper}</p>
                </div>
              );
            })}
      </div>

      <div className="reports-grid reports-grid-main">
        <Card title="Sales revenue trend">
          <p className="reports-muted">
            Daily revenue over the selected report period.
          </p>

          <div className="reports-chart-box reports-chart-box-large">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : salesTrend.length ? (
              <ReactApexChart
                type="area"
                height={340}
                options={salesTrendChartOptions}
                series={[
                  {
                    name: "Revenue",
                    data: salesTrend.map((item) => Number(item.total_revenue || 0)),
                  },
                ]}
              />
            ) : (
              <div className="reports-empty">No sales trend data available.</div>
            )}
          </div>
        </Card>

        <Card title="Top products by revenue">
          <div className="reports-card-action-row">
            <p className="reports-muted">Highest-value products in this period.</p>

            <button
              type="button"
              className="reports-small-btn"
              onClick={handleExportProducts}
              disabled={!topProducts.length}
            >
              <Download size={15} />
              CSV
            </button>
          </div>

          <div className="reports-chart-box reports-chart-box-large">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : topProducts.length ? (
              <ReactApexChart
                type="bar"
                height={340}
                options={topProductChartOptions}
                series={[
                  {
                    name: "Revenue",
                    data: topProducts.map((product) =>
                      Number(product.total_revenue || 0)
                    ),
                  },
                ]}
              />
            ) : (
              <div className="reports-empty">No product data available.</div>
            )}
          </div>
        </Card>
      </div>

      <div className="reports-grid reports-grid-secondary">
        <Card title="Quantity sold trend">
          <div className="reports-chart-box">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : salesTrend.length ? (
              <ReactApexChart
                type="bar"
                height={280}
                options={quantityTrendChartOptions}
                series={[
                  {
                    name: "Quantity sold",
                    data: salesTrend.map((item) =>
                      Number(item.total_quantity_sold || 0)
                    ),
                  },
                ]}
              />
            ) : (
              <div className="reports-empty">No quantity trend data available.</div>
            )}
          </div>
        </Card>

        <Card title="Forecast readiness">
          <div className="reports-chart-box">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : Number(forecastHealth.total || 0) > 0 ? (
              <ReactApexChart
                type="bar"
                height={280}
                options={forecastChartOptions}
                series={[
                  {
                    name: "Models",
                    data: FORECAST_STATUS_ORDER.map(
                      (status) => Number(forecastHealth?.[status] || 0)
                    ),
                  },
                ]}
              />
            ) : (
              <div className="reports-empty">No forecast status data available.</div>
            )}
          </div>
        </Card>

        <Card title="Upload activity">
          <div className="reports-chart-box">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : Number(uploadActivity.total || 0) > 0 ? (
              <ReactApexChart
                type="donut"
                height={280}
                options={uploadChartOptions}
                series={UPLOAD_STATUS_ORDER.map((status) =>
                  Number(uploadActivity?.[status] || 0)
                )}
              />
            ) : (
              <div className="reports-empty">No upload activity available.</div>
            )}
          </div>
        </Card>
      </div>

      <Card title="Campaign performance">
        <div className="reports-card-action-row">
          <p className="reports-muted">
            Campaign budget, ROI, and generated or forecasted revenue.
          </p>

          <button
            type="button"
            className="reports-small-btn"
            onClick={handleExportCampaigns}
            disabled={!campaignPerformance.length}
          >
            <Download size={15} />
            CSV
          </button>
        </div>

        <div className="reports-campaign-summary">
          <div>
            <span>Campaigns</span>
            <strong>{formatNumber(campaignTotals.count)}</strong>
          </div>

          <div>
            <span>Total budget</span>
            <strong>{formatCurrency(campaignTotals.totalBudget)}</strong>
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
                campaignPerformance.slice(0, 10).map((campaign, index) => (
                  <tr key={campaign?.campaign_id || getCampaignName(campaign) || index}>
                    <td>
                      <div className="reports-table-title">
                        {getCampaignName(campaign)}
                      </div>
                    </td>
                    <td>{getCampaignType(campaign)}</td>
                    <td>
                      <span
                        className={`reports-status-pill ${getCampaignStatus(campaign)}`}
                      >
                        {getCampaignStatus(campaign)}
                      </span>
                    </td>
                    <td>{formatCurrency(getCampaignBudget(campaign))}</td>
                    <td>{formatPercent(getCampaignRoi(campaign))}</td>
                    <td>{formatCurrency(getCampaignRevenue(campaign))}</td>
                    <td>
                      <div className="reports-date-range">
                        <CalendarDays size={14} />
                        <span>
                          {formatDate(campaign?.start_date)} →{" "}
                          {formatDate(campaign?.end_date)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
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

      <Card title="Top product details">
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Revenue</th>
                <th>Quantity sold</th>
                <th>Avg daily qty</th>
                <th>Forecast status</th>
                <th>Next 30d qty</th>
                <th>Next 30d revenue</th>
                <th>Last sale</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="reports-table-empty">
                    Loading products...
                  </td>
                </tr>
              ) : topProducts.length ? (
                topProducts.map((product) => {
                  const status = normalizeStatus(product.forecast_status || "idle");

                  return (
                    <tr key={product.product_id || product.product_name}>
                      <td>
                        <div className="reports-table-title">
                          {product.product_name || "Unnamed product"}
                        </div>
                      </td>
                      <td>{product.category || "-"}</td>
                      <td>{formatCurrency(product.total_revenue)}</td>
                      <td>{formatNumber(product.total_quantity_sold)}</td>
                      <td>{formatNumber(product.average_daily_quantity)}</td>
                      <td>
                        <span className={`reports-status-pill ${status}`}>
                          {product.forecast_status || "not started"}
                        </span>
                      </td>
                      <td>
                        {product.forecast_next_30_days_quantity == null
                          ? "-"
                          : formatNumber(product.forecast_next_30_days_quantity)}
                      </td>
                      <td>
                        {product.forecast_next_30_days_revenue == null
                          ? "-"
                          : formatCurrency(product.forecast_next_30_days_revenue)}
                      </td>
                      <td>{formatDate(product.last_sale_date)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="reports-table-empty">
                    No product data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="reports-footer-note">
          <FileText size={18} />
          <div>
            <strong>Backend reports endpoint connected.</strong>
            <p>
              This page now reads from /api/reports/dashboard using start_date and
              end_date, so totals, charts, forecast health, upload activity, and tables
              come from the reports API.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}