import api from "./api";
import { getForecastStatuses } from "./forecasts";

function readTotalCount({ data, headers }) {
  const headerVal =
    headers?.["x-total-count"] ??
    headers?.["X-Total-Count"] ??
    headers?.["x-total"] ??
    headers?.["X-Total"];

  const headerNum = Number(headerVal);
  if (!Number.isNaN(headerNum) && headerNum >= 0) return headerNum;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const candidates = [
      data.total,
      data.count,
      data.total_count,
      data.totalCount,
      data.pagination?.total,
    ];

    for (const value of candidates) {
      const n = Number(value);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
  }

  if (Array.isArray(data)) return data.length;

  return null;
}

function extractItems(data) {
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.items,
    data?.results,
    data?.uploads,
    data?.data,
    data?.batches,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

async function safeCountUsers() {
  try {
    const res = await api.get("/api/users");
    const data = res.data;

    if (Array.isArray(data)) return data.length;

    const maybe = readTotalCount({ data, headers: res.headers });
    return maybe ?? 0;
  } catch {
    return null;
  }
}

async function safeCountProducts() {
  try {
    const res = await api.get("/api/products");
    const data = res.data;

    if (data && typeof data === "object") {
      const n = Number(data.total_products);
      if (!Number.isNaN(n) && n >= 0) return n;

      if (Array.isArray(data.products)) return data.products.length;
    }

    if (Array.isArray(data)) return data.length;

    const maybe = readTotalCount({ data, headers: res.headers });
    return maybe ?? 0;
  } catch {
    return null;
  }
}

async function safeGetUploadsPage({ limit = 5, offset = 0 } = {}) {
  try {
    const res = await api.get(`/api/data/uploads?limit=${limit}&offset=${offset}`);
    const data = res.data;

    return {
      items: extractItems(data),
      total: readTotalCount({ data, headers: res.headers }),
    };
  } catch {
    return {
      items: [],
      total: null,
    };
  }
}

async function safeCountUploads() {
  const firstPage = await safeGetUploadsPage({ limit: 1, offset: 0 });

  if (firstPage.total != null) return firstPage.total;

  return firstPage.items.length;
}

export async function getDashboardSummary() {
  const [usersCount, productsCount, uploadsInfo] = await Promise.all([
    safeCountUsers(),
    safeCountProducts(),
    safeGetUploadsPage({ limit: 5, offset: 0 }),
  ]);

  return {
    usersCount,
    productsCount,
    uploadsCount: uploadsInfo.total ?? uploadsInfo.items.length,
    recentUploads: uploadsInfo.items,
  };
}

export async function getUploadsForCharts({ limit = 120 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 120, 1), 120);
  const res = await api.get(`/api/data/uploads?limit=${safeLimit}&offset=0`);
  return extractItems(res.data);
}

export async function getProductsForCharts({ limit = 120 } = {}) {
  const res = await api.get("/api/products");
  const data = res.data;
  const products = Array.isArray(data?.products)
    ? data.products
    : Array.isArray(data)
    ? data
    : [];

  return products.slice(0, limit);
}

export async function getCampaignsForDashboard() {
  try {
    const res = await api.get("/api/campaigns");
    const data = res.data;

    const campaigns = Array.isArray(data?.campaigns)
      ? data.campaigns
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
      ? data
      : [];

    return campaigns;
  } catch {
    return [];
  }
}

function normalizeForecastStatus(value) {
  const v = String(value || "").toLowerCase();

  if (["ready", "done", "success", "completed"].includes(v)) return "ready";
  if (["training", "queued", "pending", "running"].includes(v)) return "training";
  if (["failed", "error"].includes(v)) return "failed";
  return "idle";
}

export async function getForecastSummaryForDashboard() {
  try {
    const data = await getForecastStatuses();
    const list = Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data)
      ? data
      : [];

    const summary = {
      total: list.length,
      ready: 0,
      training: 0,
      failed: 0,
      idle: 0,
    };

    list.forEach((item) => {
      const key = normalizeForecastStatus(item?.forecast_status || item?.status);
      summary[key] += 1;
    });

    return summary;
  } catch {
    return {
      total: 0,
      ready: 0,
      training: 0,
      failed: 0,
      idle: 0,
    };
  }
}