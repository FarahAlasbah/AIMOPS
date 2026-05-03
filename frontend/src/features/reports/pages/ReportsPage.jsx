import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import {
  CalendarDays,
  Download,
  FileText,
  Megaphone,
  Package,
  Printer,
  TrendingUp,
  Upload,
} from "lucide-react";

import { Card, PageHeader } from "../../../shared/components";
import {
  getCampaignsForDashboard,
  getDashboardSummary,
  getForecastSummaryForDashboard,
  getProductsForCharts,
  getUploadsForCharts,
} from "../../../api/dashboard";

import "./ReportsPage.css";

const PERIOD_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" },
  { value: "365", label: "Last year" },
  { value: "all", label: "All time" },
];

const CAMPAIGN_STATUS_ORDER = ["active", "planned", "completed", "unknown"];
const FORECAST_STATUS_ORDER = ["ready", "training", "failed", "idle"];

function normalizeStatus(value) {
  const status = String(value || "").toLowerCase();
  return status || "unknown";
}

function getDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getPeriodStart(period) {
  if (period === "all") return null;

  const days = Number(period);
  if (!Number.isFinite(days)) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return start;
}

function isInsidePeriod(value, periodStart) {
  if (!periodStart) return true;

  const date = getDateValue(value);
  if (!date) return false;

  return date >= periodStart;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
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

function dayKey(value) {
  const date = getDateValue(value);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shortDayLabel(value) {
  const date = getDateValue(value);
  if (!date) return String(value || "");

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getProductRevenue(product) {
  return Number(product?.stats?.total_revenue ?? product?.total_revenue ?? 0) || 0;
}

function getProductSales(product) {
  return Number(product?.stats?.total_sales ?? product?.total_sales ?? 0) || 0;
}

function getProductName(product) {
  return product?.product_name || product?.name || "Unnamed product";
}

function getProductCategory(product) {
  return product?.category || "Uncategorized";
}

function getUploadDate(upload) {
  return upload?.uploaded_at || upload?.created_at || upload?.date || upload?.uploadedAt;
}

function getCampaignDate(campaign) {
  return campaign?.start_date || campaign?.created_at || campaign?.date;
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

export default function ReportsPage() {
  const [period, setPeriod] = useState("90");

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [summary, setSummary] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [forecastSummary, setForecastSummary] = useState({
    total: 0,
    ready: 0,
    training: 0,
    failed: 0,
    idle: 0,
  });

  const loadReports = async () => {
    setLoading(true);
    setPageError("");

    try {
      const [
        summaryData,
        uploadList,
        productList,
        campaignList,
        forecastData,
      ] = await Promise.all([
        getDashboardSummary(),
        getUploadsForCharts({ limit: 500 }),
        getProductsForCharts({ limit: 300 }),
        getCampaignsForDashboard(),
        getForecastSummaryForDashboard(),
      ]);

      setSummary(summaryData || {});
      setUploads(Array.isArray(uploadList) ? uploadList : []);
      setProducts(Array.isArray(productList) ? productList : []);
      setCampaigns(Array.isArray(campaignList) ? campaignList : []);
      setForecastSummary(
        forecastData || {
          total: 0,
          ready: 0,
          training: 0,
          failed: 0,
          idle: 0,
        }
      );
    } catch (error) {
      setPageError(error?.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const periodStart = useMemo(() => getPeriodStart(period), [period]);

  const filteredUploads = useMemo(() => {
    return uploads.filter((upload) => isInsidePeriod(getUploadDate(upload), periodStart));
  }, [uploads, periodStart]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) =>
      isInsidePeriod(getCampaignDate(campaign), periodStart)
    );
  }, [campaigns, periodStart]);

  const productTotals = useMemo(() => {
    let totalRevenue = 0;
    let totalSales = 0;
    let productsWithSales = 0;

    products.forEach((product) => {
      const revenue = getProductRevenue(product);
      const sales = getProductSales(product);

      totalRevenue += revenue;
      totalSales += sales;

      if (sales > 0 || revenue > 0) {
        productsWithSales += 1;
      }
    });

    return {
      totalRevenue,
      totalSales,
      productsWithSales,
      averageRevenuePerProduct:
        productsWithSales > 0 ? totalRevenue / productsWithSales : 0,
    };
  }, [products]);

  const campaignTotals = useMemo(() => {
    let totalBudget = 0;
    let additionalRevenue = 0;
    let totalRoi = 0;
    let roiCount = 0;

    filteredCampaigns.forEach((campaign) => {
      totalBudget += Number(campaign?.budget || 0);
      additionalRevenue += Number(
        campaign?.forecast_additional_revenue ||
          campaign?.additional_revenue ||
          campaign?.forecast_impact?.totals?.additional_revenue ||
          0
      );

      const roi = Number(campaign?.predicted_roi ?? campaign?.estimated_roi);
      if (Number.isFinite(roi)) {
        totalRoi += roi;
        roiCount += 1;
      }
    });

    return {
      total: filteredCampaigns.length,
      totalBudget,
      additionalRevenue,
      averageRoi: roiCount > 0 ? totalRoi / roiCount : null,
    };
  }, [filteredCampaigns]);

  const topProducts = useMemo(() => {
    return [...products]
      .map((product) => ({
        id: product?.product_id ?? product?.id ?? getProductName(product),
        name: getProductName(product),
        category: getProductCategory(product),
        revenue: getProductRevenue(product),
        sales: getProductSales(product),
        lastSale: product?.stats?.last_sale || product?.last_sale || null,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [products]);

  const campaignStatusStats = useMemo(() => {
    const counts = {
      active: 0,
      planned: 0,
      completed: 0,
      unknown: 0,
    };

    filteredCampaigns.forEach((campaign) => {
      const status = normalizeStatus(campaign?.status);
      if (counts[status] === undefined) counts.unknown += 1;
      else counts[status] += 1;
    });

    return counts;
  }, [filteredCampaigns]);

  const uploadsOverTime = useMemo(() => {
    const map = new Map();

    filteredUploads.forEach((upload) => {
      const key = dayKey(getUploadDate(upload));
      if (!key) return;

      map.set(key, (map.get(key) || 0) + 1);
    });

    const sortedKeys = Array.from(map.keys()).sort().slice(-14);

    return {
      labels: sortedKeys.map(shortDayLabel),
      values: sortedKeys.map((key) => map.get(key) || 0),
    };
  }, [filteredUploads]);

  const campaignTimeline = useMemo(() => {
    const map = new Map();

    filteredCampaigns.forEach((campaign) => {
      const key = dayKey(getCampaignDate(campaign));
      if (!key) return;

      map.set(key, (map.get(key) || 0) + 1);
    });

    const sortedKeys = Array.from(map.keys()).sort().slice(-14);

    return {
      labels: sortedKeys.map(shortDayLabel),
      values: sortedKeys.map((key) => map.get(key) || 0),
    };
  }, [filteredCampaigns]);

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
        categories: topProducts.map((product) => product.name),
        labels: {
          formatter: (value) => formatNumber(value),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatCurrency(value),
        },
      },
    };
  }, [topProducts]);

  const statusChartOptions = useMemo(() => {
    return {
      chart: {
        type: "donut",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      labels: CAMPAIGN_STATUS_ORDER.map((status) => {
        if (status === "active") return "Active";
        if (status === "planned") return "Planned";
        if (status === "completed") return "Completed";
        return "Unknown";
      }),
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
                label: "Campaigns",
                formatter: () => formatNumber(filteredCampaigns.length),
              },
            },
          },
        },
      },
    };
  }, [filteredCampaigns.length]);

  const timelineChartOptions = useMemo(() => {
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
          opacityFrom: 0.26,
          opacityTo: 0.05,
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: uploadsOverTime.labels,
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (value) => formatNumber(value),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => `${formatNumber(value)} uploads`,
        },
      },
    };
  }, [uploadsOverTime.labels]);

  const campaignTimelineChartOptions = useMemo(() => {
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
        categories: campaignTimeline.labels,
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (value) => formatNumber(value),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => `${formatNumber(value)} campaigns`,
        },
      },
    };
  }, [campaignTimeline.labels]);

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
          columnWidth: "44%",
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
          formatter: (value) => formatNumber(value),
        },
      },
    };
  }, []);

  const reportCards = useMemo(() => {
    return [
      {
        label: "Total revenue",
        value: formatCurrency(productTotals.totalRevenue),
        helper: "Based on product sales totals",
        icon: TrendingUp,
        tone: "blue",
      },
      {
        label: "Sales records",
        value: formatNumber(productTotals.totalSales),
        helper: "Total sales records from products",
        icon: Package,
        tone: "indigo",
      },
      {
        label: "Campaigns",
        value: formatNumber(campaignTotals.total),
        helper: `${formatCurrency(campaignTotals.totalBudget)} total budget`,
        icon: Megaphone,
        tone: "violet",
      },
      {
        label: "Data uploads",
        value: formatNumber(filteredUploads.length),
        helper: `${formatNumber(summary?.uploadsCount ?? uploads.length)} all-time uploads`,
        icon: Upload,
        tone: "emerald",
      },
    ];
  }, [productTotals, campaignTotals, filteredUploads.length, summary, uploads.length]);

  const handleExportProducts = () => {
    const rows = [
      ["Product", "Category", "Revenue", "Sales records", "Last sale"],
      ...topProducts.map((product) => [
        product.name,
        product.category,
        product.revenue,
        product.sales,
        product.lastSale || "",
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
        "Predicted ROI",
        "Additional revenue",
        "Start date",
        "End date",
      ],
      ...filteredCampaigns.map((campaign) => [
        campaign?.campaign_name || "",
        campaign?.campaign_type || "",
        campaign?.status || "",
        campaign?.budget ?? "",
        campaign?.predicted_roi ?? "",
        campaign?.forecast_additional_revenue ?? "",
        campaign?.start_date || "",
        campaign?.end_date || "",
      ]),
    ];

    downloadCsv("aimops-campaigns-report.csv", rows);
  };

  return (
    <div className="reports-page">
      <PageHeader
        title="Reports"
        subtitle="A clear business snapshot built from your existing AIMOPS data."
        actions={
          <div className="reports-header-actions">
            <button type="button" className="reports-btn reports-btn-secondary" onClick={loadReports}>
              Refresh
            </button>

            <button type="button" className="reports-btn reports-btn-secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Print
            </button>
          </div>
        }
      />

      {pageError ? <div className="reports-alert reports-alert-error">{pageError}</div> : null}

      <Card>
        <div className="reports-toolbar">
          <div>
            <div className="reports-toolbar-title">Report period</div>
            <p>
              Product revenue is shown from available product totals. Uploads and campaigns are filtered by date.
            </p>
          </div>

          <select
            className="reports-period-select"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="reports-stat-grid">
        {reportCards.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className={`reports-stat-card tone-${item.tone}`}>
              <div className="reports-stat-top">
                <div>
                  <span>{item.label}</span>
                  <strong>{loading ? "—" : item.value}</strong>
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
        <Card title="Top products by revenue">
          <div className="reports-card-action-row">
            <p className="reports-muted">Your highest-value products based on available product stats.</p>

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
                    data: topProducts.map((product) => product.revenue),
                  },
                ]}
              />
            ) : (
              <div className="reports-empty">No product data available.</div>
            )}
          </div>
        </Card>

        <Card title="Campaign status">
          <p className="reports-muted">Current campaign split for the selected period.</p>

          <div className="reports-chart-box reports-chart-box-large">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : filteredCampaigns.length ? (
              <ReactApexChart
                type="donut"
                height={340}
                options={statusChartOptions}
                series={CAMPAIGN_STATUS_ORDER.map(
                  (status) => campaignStatusStats[status] || 0
                )}
              />
            ) : (
              <div className="reports-empty">No campaigns in this period.</div>
            )}
          </div>
        </Card>
      </div>

      <div className="reports-grid reports-grid-secondary">
        <Card title="Uploads over time">
          <div className="reports-chart-box">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : uploadsOverTime.values.length ? (
              <ReactApexChart
                type="area"
                height={280}
                options={timelineChartOptions}
                series={[
                  {
                    name: "Uploads",
                    data: uploadsOverTime.values,
                  },
                ]}
              />
            ) : (
              <div className="reports-empty">No uploads in this period.</div>
            )}
          </div>
        </Card>

        <Card title="Campaigns over time">
          <div className="reports-chart-box">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : campaignTimeline.values.length ? (
              <ReactApexChart
                type="bar"
                height={280}
                options={campaignTimelineChartOptions}
                series={[
                  {
                    name: "Campaigns",
                    data: campaignTimeline.values,
                  },
                ]}
              />
            ) : (
              <div className="reports-empty">No campaigns in this period.</div>
            )}
          </div>
        </Card>

        <Card title="Forecast readiness">
          <div className="reports-chart-box">
            {loading ? (
              <div className="reports-empty">Loading chart...</div>
            ) : Number(forecastSummary?.total || 0) > 0 ? (
              <ReactApexChart
                type="bar"
                height={280}
                options={forecastChartOptions}
                series={[
                  {
                    name: "Products",
                    data: FORECAST_STATUS_ORDER.map(
                      (status) => forecastSummary?.[status] || 0
                    ),
                  },
                ]}
              />
            ) : (
              <div className="reports-empty">No forecast status data available.</div>
            )}
          </div>
        </Card>
      </div>

      <Card title="Campaign performance">
        <div className="reports-card-action-row">
          <p className="reports-muted">
            Campaign budget, predicted ROI, and forecasted extra revenue from existing campaign data.
          </p>

          <button
            type="button"
            className="reports-small-btn"
            onClick={handleExportCampaigns}
            disabled={!filteredCampaigns.length}
          >
            <Download size={15} />
            CSV
          </button>
        </div>

        <div className="reports-campaign-summary">
          <div>
            <span>Total budget</span>
            <strong>{formatCurrency(campaignTotals.totalBudget)}</strong>
          </div>

          <div>
            <span>Forecasted extra revenue</span>
            <strong>{formatCurrency(campaignTotals.additionalRevenue)}</strong>
          </div>

          <div>
            <span>Average ROI</span>
            <strong>{campaignTotals.averageRoi == null ? "-" : formatPercent(campaignTotals.averageRoi)}</strong>
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
                <th>Predicted ROI</th>
                <th>Additional revenue</th>
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
              ) : filteredCampaigns.length ? (
                filteredCampaigns.slice(0, 10).map((campaign) => (
                  <tr key={campaign?.campaign_id || campaign?.campaign_name}>
                    <td>
                      <div className="reports-table-title">
                        {campaign?.campaign_name || "Untitled campaign"}
                      </div>
                    </td>
                    <td>{campaign?.campaign_type || "-"}</td>
                    <td>
                      <span className={`reports-status-pill ${normalizeStatus(campaign?.status)}`}>
                        {campaign?.status || "unknown"}
                      </span>
                    </td>
                    <td>{formatCurrency(campaign?.budget)}</td>
                    <td>{formatPercent(campaign?.predicted_roi)}</td>
                    <td>{formatCurrency(campaign?.forecast_additional_revenue)}</td>
                    <td>
                      <div className="reports-date-range">
                        <CalendarDays size={14} />
                        <span>
                          {formatDate(campaign?.start_date)} → {formatDate(campaign?.end_date)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="reports-table-empty">
                    No campaigns found for this period.
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
                <th>Sales records</th>
                <th>Last sale</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="reports-table-empty">
                    Loading products...
                  </td>
                </tr>
              ) : topProducts.length ? (
                topProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="reports-table-title">{product.name}</div>
                    </td>
                    <td>{product.category}</td>
                    <td>{formatCurrency(product.revenue)}</td>
                    <td>{formatNumber(product.sales)}</td>
                    <td>{formatDate(product.lastSale)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="reports-table-empty">
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
            <strong>Frontend-only report for now.</strong>
            <p>
              This page uses the existing dashboard, products, uploads, campaigns, and forecast requests.
              When the backend reports endpoint is ready, only the data loading part needs to change.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}