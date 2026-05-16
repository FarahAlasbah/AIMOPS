export const extractApiError = (err, fallback) => {
  const data = err?.response?.data;

  if (!data) {
    return err?.message || fallback;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((detail) => {
        const loc = Array.isArray(detail?.loc) ? detail.loc.join(".") : "";
        const msg = detail?.msg || "Invalid input";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof data.detail === "string") return data.detail;

  if (data.detail && typeof data.detail === "object") {
    if (typeof data.detail.message === "string") return data.detail.message;

    try {
      return JSON.stringify(data.detail);
    } catch {
      return fallback;
    }
  }

  if (typeof data.message === "string") return data.message;
  if (typeof err?.message === "string") return err.message;

  return fallback;
};

export const unwrapUploadDetails = (payload) => {
  if (!payload || typeof payload !== "object") return null;

  return (
    payload.upload ||
    payload.batch ||
    payload.data ||
    payload.details ||
    payload
  );
};

export const getExistingBatchIdFrom409 = (err) => {
  const detail = err?.response?.data?.detail;

  const candidates = [
    detail?.existing_batch?.batch_id,
    detail?.existing_batch?.batchId,
    detail?.batch_id,
    detail?.batchId,
    err?.response?.data?.existing_batch?.batch_id,
    err?.response?.data?.existing_batch?.batchId,
    err?.response?.data?.batch_id,
    err?.response?.data?.batchId,
  ];

  const found = candidates.find(
    (id) => typeof id === "number" || typeof id === "string",
  );

  return found == null ? "" : String(found);
};

export const cleanStr = (value) => String(value ?? "").trim();