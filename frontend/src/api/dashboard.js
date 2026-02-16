// frontend/src/api/dashboard.js
import api from "./api";

/**
 * Tries to extract total count from common backend shapes:
 * - Response header: x-total-count
 * - Body: { total }, { count }, { total_count }
 * - Body: array (fallback to array length)
 */
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
    for (const v of candidates) {
      const n = Number(v);
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

    // Your backend shape:
    // { success: true, total_products: 87, products: [...] }
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

    // Your backend returns a plain array
    if (Array.isArray(data)) return data;

    // Fallbacks if you ever change backend shape later
    const items = data?.items || data?.results || [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function safeCountUploads() {
  // Since your backend returns a plain array and doesn't return a total,
  // we count by paging until the last page.
  const limit = 200;
  const maxPages = 500; // safety cap

  let offset = 0;
  let total = 0;

  for (let page = 0; page < maxPages; page++) {
    try {
      const res = await api.get(`/api/data/uploads?limit=${limit}&offset=${offset}`);
      const data = res.data;

      const items = Array.isArray(data) ? data : data?.items || data?.results || [];
      total += items.length;

      if (items.length < limit) break; // last page
      offset += limit;
    } catch {
      return null;
    }
  }

  return total;
}

/**
 * Dashboard summary from endpoints you already have.
 */
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
  // Just grab first N uploads; good enough for dashboard charts.
  // If you want “all”, we can reuse the paging logic later.
  const res = await api.get(`/api/data/uploads?limit=${limit}&offset=0`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getProductsForCharts({ limit = 200 } = {}) {
  // Your products endpoint returns { total_products, products: [...] }
  const res = await api.get("/api/products");
  const data = res.data;
  const products = Array.isArray(data?.products) ? data.products : [];
  return products.slice(0, limit);
}
