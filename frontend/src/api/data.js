// frontend/src/api/data.js
import api from "./api";

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

function extractTotal(data, headers, fallback) {
  const headerVal =
    headers?.["x-total-count"] ??
    headers?.["X-Total-Count"] ??
    headers?.["x-total"] ??
    headers?.["X-Total"];

  const headerNum = Number(headerVal);
  if (!Number.isNaN(headerNum) && headerNum >= 0) return headerNum;

  const candidates = [
    data?.total,
    data?.count,
    data?.total_count,
    data?.totalCount,
    data?.pagination?.total,
  ];

  for (const value of candidates) {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 0) return n;
  }

  return fallback;
}

export const uploadSalesData = async ({ file, campaignId, onProgress }) => {
  const formData = new FormData();
  formData.append("file", file);

  if (campaignId) {
    formData.append("campaign_id", campaignId);
  }

  const res = await api.post("/api/data/upload-sales", formData, {
    onUploadProgress: (evt) => {
      if (!evt.total) return;

      const percent = Math.round((evt.loaded * 100) / evt.total);
      onProgress?.(percent);
    },
  });

  return res.data;
};

export const getUploadsPage = async ({
  limit = 20,
  offset = 0,
  search = "",
  sortBy = "newest",
  dateFrom = "",
  dateTo = "",
} = {}) => {
  const params = new URLSearchParams();

  params.set("limit", String(limit));
  params.set("offset", String(offset));

  if (search.trim()) params.set("search", search.trim());
  if (sortBy) params.set("sort", sortBy);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);

  const query = params.toString();
  const res = await api.get(`/api/data/uploads${query ? `?${query}` : ""}`);

  const items = extractItems(res.data);
  const total = extractTotal(res.data, res.headers, null);

  const normalizedTotal =
    total == null
      ? offset + items.length + (items.length >= limit ? 1 : 0)
      : total;

  return {
    items,
    total: normalizedTotal,
    limit,
    offset,
    hasNext:
      typeof res.data?.has_next === "boolean"
        ? res.data.has_next
        : typeof res.data?.hasNext === "boolean"
          ? res.data.hasNext
          : offset + items.length < normalizedTotal || items.length >= limit,
  };
};

export const getAllUploads = async ({ limit = 100, maxPages = 10 } = {}) => {
  const all = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * limit;
    const chunk = await getUploadsPage({ limit, offset });
    const list = Array.isArray(chunk?.items) ? chunk.items : [];

    all.push(...list);

    if (!chunk.hasNext || list.length < limit) break;
  }

  return all;
};

export const getUploadDetails = async (batchId) => {
  const id = encodeURIComponent(String(batchId));
  const res = await api.get(`/api/data/uploads/${id}`);
  return res.data;
};

export const analyzeSalesBatch = async (batchId) => {
  const id = encodeURIComponent(String(batchId));
  const res = await api.get(`/api/data/analyze/${id}`);
  return res.data;
};

export const confirmSalesMappings = async (batchId, payload) => {
  const id = encodeURIComponent(String(batchId));
  const res = await api.post(`/api/data/confirm-mappings/${id}`, payload);
  return res.data;
};

export const confirmProducts = async (batchId, payload) => {
  const id = encodeURIComponent(String(batchId));
  const res = await api.post(`/api/data/confirm-products/${id}`, payload);
  return res.data;
};

export const deleteConfirmedProducts = async (batchId) => {
  const id = encodeURIComponent(String(batchId));
  const res = await api.delete(`/api/data/confirm-products/${id}`);
  return res.data;
};

export const deleteUploadBatch = async (batchId) => {
  const id = encodeURIComponent(String(batchId));
  const res = await api.delete(`/api/data/uploads/${id}`);
  return res.data;
};