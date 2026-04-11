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
    const candidates = [data.total, data.count, data.total_count];
    for (const value of candidates) {
      const n = Number(value);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
  }

  if (Array.isArray(data)) return data.length;

  return null;
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

    if (Array.isArray(data)) return data;

    const items = data?.items || data?.results || [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function safeCountUploads() {
  const limit = 200;
  const maxPages = 500;

  let offset = 0;
  let total = 0;

  for (let page = 0; page < maxPages; page += 1) {
    try {
      const res = await api.get(`/api/data/uploads?limit=${limit}&offset=${offset}`);
      const data = res.data;
      const items = Array.isArray(data) ? data : data?.items || data?.results || [];

      total += items.length;

      if (items.length < limit) break;
      offset += limit;
    } catch {
      return null;
    }
  }

  return total;
}

export async function getDashboardSummary() {
  const [usersCount, productsCount, uploadsCount, recentUploads] = await Promise.all([
    safeCountUsers(),
    safeCountProducts(),
    safeCountUploads(),
    safeGetUploadsPage({ limit: 5, offset: 0 }),
  ]);

  return {
    usersCount,
    productsCount,
    uploadsCount,
    recentUploads,
  };
}

export async function getUploadsForCharts({ limit = 500 } = {}) {
  const res = await api.get(`/api/data/uploads?limit=${limit}&offset=0`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getProductsForCharts({ limit = 200 } = {}) {
  const res = await api.get("/api/products");
  const data = res.data;
  const products = Array.isArray(data?.products) ? data.products : [];
  return products.slice(0, limit);
}

export async function getCampaignsForDashboard() {
  try {
    const res = await api.get("/api/campaigns");
    const data = res.data;
    const campaigns = Array.isArray(data?.campaigns)
      ? data.campaigns
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