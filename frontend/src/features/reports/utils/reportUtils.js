import { ALL_TIME_START_DATE } from "../constants";

export function getIntlLocale(locale) {
  return String(locale || "").startsWith("ar") ? "ar" : "en-US";
}

export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDateRangeFromPeriod(period) {
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

export function normalizeSelectValue(value) {
  if (value?.target?.value) return value.target.value;
  if (value?.value) return value.value;
  return value;
}

export function toNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback;

  const cleaned =
    typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeStatus(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\s+/g, "-");
}

export function formatStatus(value, t) {
  const status = normalizeStatus(value);

  if (typeof t === "function") {
    return t(`status.${status}`, {
      defaultValue: status.replaceAll("-", " "),
    });
  }

  return status.replaceAll("-", " ");
}

export function formatNumber(value, digits = 1, locale = "en") {
  const number = toNumber(value, 0);

  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: digits,
  }).format(number);
}

export function formatCurrency(value, locale = "en") {
  const number = toNumber(value, 0);

  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatPercent(value, locale = "en") {
  if (value == null || value === "") return "-";

  const number = toNumber(value, NaN);
  if (!Number.isFinite(number)) return "-";

  return `${new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 1,
  }).format(number)}%`;
}

export function formatDate(value, locale = "en") {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function shortDayLabel(value, locale = "en") {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function extractArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

async function downloadExcel(filename, sheetName, rows) {
  const XLSX = await import("xlsx");
  const safeRows = Array.isArray(rows) ? rows : [];

  const worksheet = XLSX.utils.aoa_to_sheet(safeRows);

  worksheet["!cols"] = safeRows[0]?.map((_, columnIndex) => {
    const maxLength = safeRows.reduce((max, row) => {
      const value = String(row[columnIndex] ?? "");
      return Math.max(max, value.length);
    }, 10);

    return { wch: Math.min(Math.max(maxLength + 2, 12), 34) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function tr(t, key, fallback) {
  return typeof t === "function" ? t(key, { defaultValue: fallback }) : fallback;
}

export function getCampaignId(campaign) {
  return (
    campaign?.campaign_id ??
    campaign?.id ??
    campaign?.campaignId ??
    campaign?._id ??
    null
  );
}

export function getCampaignName(campaign, fallback = "Untitled campaign") {
  return campaign?.campaign_name || campaign?.name || campaign?.title || fallback;
}

export function getCampaignType(campaign, fallback = "-") {
  return (
    campaign?.campaign_type ||
    campaign?.type ||
    campaign?.channel ||
    campaign?.objective ||
    fallback
  );
}

export function getCampaignStatus(campaign) {
  return normalizeStatus(campaign?.status);
}

export function getCampaignBudget(campaign) {
  return toNumber(campaign?.budget ?? campaign?.total_budget, 0);
}

export function getCampaignRoi(campaign) {
  return (
    campaign?.predicted_roi ??
    campaign?.estimated_roi ??
    campaign?.roi ??
    campaign?.expected_roi ??
    null
  );
}

export function getCampaignRevenue(campaign) {
  return toNumber(
    campaign?.forecast_additional_revenue ??
      campaign?.forecastAdditionalRevenue ??
      campaign?.forecast_addtional_revenue ??
      campaign?.additional_revenue ??
      campaign?.expected_revenue ??
      campaign?.predicted_revenue ??
      campaign?.revenue ??
      campaign?.total_revenue,
    0,
  );
}

export function getCampaignStartDate(campaign) {
  return campaign?.start_date || campaign?.startDate || campaign?.starts_at;
}

export function getCampaignEndDate(campaign) {
  return campaign?.end_date || campaign?.endDate || campaign?.ends_at;
}

export function getForecastCount(forecastHealth, status) {
  if (status === "idle") {
    return toNumber(
      forecastHealth?.idle ??
        forecastHealth?.not_started ??
        forecastHealth?.notStarted,
      0,
    );
  }

  return toNumber(forecastHealth?.[status], 0);
}

export function getUploadCount(uploadActivity, status) {
  if (status === "mapping") {
    return toNumber(uploadActivity?.mapping ?? uploadActivity?.needs_mapping, 0);
  }

  return toNumber(uploadActivity?.[status], 0);
}

export async function exportProductsExcel(topProducts, t) {
  const rows = [
    [
      tr(t, "excel.products.product", "Product"),
      tr(t, "excel.products.category", "Category"),
      tr(t, "excel.products.revenue", "Revenue"),
      tr(t, "excel.products.quantitySold", "Quantity sold"),
      tr(t, "excel.products.salesRecords", "Sales records"),
      tr(t, "excel.products.averageDailyQuantity", "Average daily quantity"),
      tr(t, "excel.products.lastSale", "Last sale"),
      tr(t, "excel.products.forecastStatus", "Forecast status"),
      tr(
        t,
        "excel.products.forecastNext30Quantity",
        "Forecast next 30 days quantity",
      ),
      tr(
        t,
        "excel.products.forecastNext30Revenue",
        "Forecast next 30 days revenue",
      ),
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

  await downloadExcel("aimops-top-products-report.xlsx", "Top Products", rows);
}

export async function exportCampaignsExcel(campaignPerformance, t) {
  const rows = [
    [
      tr(t, "excel.campaigns.campaign", "Campaign"),
      tr(t, "excel.campaigns.type", "Type"),
      tr(t, "excel.campaigns.status", "Status"),
      tr(t, "excel.campaigns.budget", "Budget"),
      tr(t, "excel.campaigns.expectedRevenue", "Expected revenue"),
      tr(t, "excel.campaigns.startDate", "Start date"),
      tr(t, "excel.campaigns.endDate", "End date"),
    ],
    ...campaignPerformance.map((campaign) => [
      getCampaignName(campaign),
      getCampaignType(campaign),
      getCampaignStatus(campaign),
      getCampaignBudget(campaign),
      getCampaignRevenue(campaign),
      getCampaignStartDate(campaign) || "",
      getCampaignEndDate(campaign) || "",
    ]),
  ];

  await downloadExcel("aimops-campaign-performance-report.xlsx", "Campaigns", rows);
}