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
  return res.data; // array
};

// Confirm mappings (saves to DB)
export const confirmSalesMappings = async (batchId, payload) => {
  const res = await api.post(`/api/data/confirm-mappings/${batchId}`, payload);
  return res.data;
};

// NEW: Extract products
export const extractProducts = async (batchId, payload) => {
  const res = await api.post(`/api/data/extract-products/${batchId}`, payload);
  return res.data;
};

// NEW: Confirm products (imports final sales records)
export const confirmProducts = async (batchId, payload) => {
  const res = await api.post(`/api/data/confirm-products/${batchId}`, payload);
  return res.data;
};

// NOTE: processSalesBatch removed (endpoint is deleted from the flow)
