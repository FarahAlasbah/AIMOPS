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

export const getAllUploads = async () => {
  const res = await api.get("/api/data/uploads");
  return res.data; // array
};

// Not in the doc: keep as TODO until backend adds it
export const submitSalesMapping = async (batchId, payload) => {
  return { success: true, note: "No backend mapping endpoint yet", batchId, payload };
};
