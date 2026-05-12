// frontend/src/api/products.js
import api from "./api";

export async function getProducts() {
  const res = await api.get("/api/products");
  return res.data;
}

export async function mergeProducts({ primary_product_id, merge_product_ids }) {
  const res = await api.post("/api/products/merge", {
    primary_product_id,
    merge_product_ids,
  });

  return res.data;
}

export async function bulkDeleteProducts({ product_ids, force }) {
  const res = await api.delete("/api/products/bulk-delete", {
    data: {
      product_ids,
      force,
    },
  });

  return res.data;
}