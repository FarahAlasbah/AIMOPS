const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_EXT = new Set(["csv", "xlsx"]);

const DEDUPE_STORAGE_KEY = "sales_upload_dedupe_keys_v1";

const getFileKey = (file) => `${file.name}__${file.size}__${file.lastModified}`;

const getExt = (filename) => {
  const parts = String(filename).toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

const readDedupeSet = () => {
  try {
    const raw = localStorage.getItem(DEDUPE_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const writeDedupeSet = (set) => {
  localStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const validateSelectedFile = (file) => {
  if (!file) return { ok: false, message: "No file selected." };

  const ext = getExt(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, message: "Only .csv and .xlsx files are allowed." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, message: `File is too large. Max size is ${MAX_MB} MB.` };
  }

  return { ok: true, message: "" };
};

export {
  MAX_MB,
  MAX_BYTES,
  ALLOWED_EXT,
  getExt,
  getFileKey,
  readDedupeSet,
  writeDedupeSet,
  validateSelectedFile,
};
