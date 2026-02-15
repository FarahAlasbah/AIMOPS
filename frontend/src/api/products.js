// frontend/src/api/products.js

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

const getToken = () => localStorage.getItem("auth_token");

async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg =
      (data && (data.message || data.detail)) ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function getProducts() {
  // GET /api/products
  return apiRequest("/api/products");
}

export async function mergeProducts({ primary_product_id, merge_product_ids }) {
  // POST /api/products/merge
  return apiRequest("/api/products/merge", {
    method: "POST",
    body: { primary_product_id, merge_product_ids },
  });
}

export async function bulkDeleteProducts({ product_ids, force }) {
  // DELETE /api/products/bulk-delete
  return apiRequest("/api/products/bulk-delete", {
    method: "DELETE",
    body: { product_ids, force },
  });
}
