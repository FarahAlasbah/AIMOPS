// frontend/src/api/data.js
import api from "./api";

export const uploadSalesData = async ({ file, campaignId, onProgress }) => {
  const formData = new FormData();
  formData.append("file", file);
  if (campaignId) formData.append("campaign_id", campaignId);

  const res = await api.post("/api/data/upload-sales", formData, {
    onUploadProgress: (evt) => {
      if (!evt.total) return;
      const percent = Math.round((evt.loaded * 100) / evt.total);
      onProgress?.(percent);
    },
  });

  return res.data;
};

export const analyzeSalesBatch = async (batchId) => {
  const res = await api.get(`/api/data/analyze/${batchId}`);
  return res.data;
};

// Backend pagination
export const getUploadsPage = async ({ limit = 20, offset = 0 } = {}) => {
  const res = await api.get(`/api/data/uploads?limit=${limit}&offset=${offset}`);
  return res.data;
};

// NEW: fetch all uploads across pages (used for search/sort/filter + status lookup)
export const getAllUploads = async ({ limit = 100, maxPages = 50 } = {}) => {
  const all = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * limit;
    const chunk = await getUploadsPage({ limit, offset });
    const list = Array.isArray(chunk) ? chunk : [];

    all.push(...list);

    if (list.length < limit) break;
  }

  return all;
};

// Confirm mappings — response includes products.products[] directly
export const confirmSalesMappings = async (batchId, payload) => {
  const res = await api.post(`/api/data/confirm-mappings/${batchId}`, payload);
  return res.data;
};

// Confirm products (imports final sales records)
export const confirmProducts = async (batchId, payload) => {
  const res = await api.post(`/api/data/confirm-products/${batchId}`, payload);
  return res.data;
};

export const deleteUploadBatch = async (batchId) => {
  const id = encodeURIComponent(String(batchId));
  const res = await api.delete(`/api/data/uploads/${id}`);
  return res.data;
};