// frontend/src/features/data-upload/utils/fileUtils.js

const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_EXT = new Set(["csv", "xlsx"]);

const getFileKey = (file) => `${file.name}__${file.size}__${file.lastModified}`;

const getExt = (filename) => {
  const parts = String(filename).toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

const translate = (t, key, defaultValue, options = {}) => {
  if (typeof t === "function") {
    return t(key, { defaultValue, ...options });
  }

  return defaultValue;
};

const validateSelectedFile = (file, t) => {
  if (!file) {
    return {
      ok: false,
      message: translate(t, "fileValidation.noFile", "No file selected."),
    };
  }

  const ext = getExt(file.name);

  if (!ALLOWED_EXT.has(ext)) {
    return {
      ok: false,
      message: translate(
        t,
        "fileValidation.invalidType",
        "Only .csv and .xlsx files are allowed.",
      ),
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: translate(
        t,
        "fileValidation.tooLarge",
        `File is too large. Max size is ${MAX_MB} MB.`,
        { maxMb: MAX_MB },
      ),
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