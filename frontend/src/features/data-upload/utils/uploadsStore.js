const UPLOADS_KEY = "sales_uploads_v1";

const safeParse = (raw, fallback) => {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

export const getUploads = () => {
  const raw = localStorage.getItem(UPLOADS_KEY);
  const arr = safeParse(raw, []);
  if (!Array.isArray(arr)) return [];
  // newest first
  return arr.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
};

export const addUpload = (upload) => {
  const list = getUploads();

  // avoid duplicates by batchId
  const exists = list.some((u) => String(u.batchId) === String(upload.batchId));
  if (exists) return;

  list.unshift(upload);
  localStorage.setItem(UPLOADS_KEY, JSON.stringify(list));
};

export const updateUpload = (batchId, patch) => {
  const list = getUploads();
  const next = list.map((u) =>
    String(u.batchId) === String(batchId) ? { ...u, ...patch } : u
  );
  localStorage.setItem(UPLOADS_KEY, JSON.stringify(next));
};

export const removeUpload = (batchId) => {
  const list = getUploads();
  const next = list.filter((u) => String(u.batchId) !== String(batchId));
  localStorage.setItem(UPLOADS_KEY, JSON.stringify(next));
};
