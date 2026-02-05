const key = (batchId) => `sales_batch_analysis_v1_${batchId}`;

export const getCachedAnalysis = (batchId) => {
  try {
    const raw = localStorage.getItem(key(batchId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedAnalysis = (batchId, analysis) => {
  localStorage.setItem(key(batchId), JSON.stringify(analysis));
};

export const clearCachedAnalysis = (batchId) => {
  localStorage.removeItem(key(batchId));
};
