// frontend/src/features/data-upload/utils/fileUtils.js
const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_EXT = new Set(["csv", "xlsx"]);

const getFileKey = (file) => `${file.name}__${file.size}__${file.lastModified}`;

const getExt = (filename) => {
  const parts = String(filename).toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

const validateSelectedFile = (file) => {
  if (!file) {
    return { ok: false, message: "No file selected." };
  }

  const ext = getExt(file.name);

  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, message: "Only .csv and .xlsx files are allowed." };
  }

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: `File is too large. Max size is ${MAX_MB} MB.`,
    };
  }

  return { ok: true, message: "" };
};

export {
  MAX_MB,
  MAX_BYTES,
  ALLOWED_EXT,
  getExt,
  getFileKey,
  validateSelectedFile,
};