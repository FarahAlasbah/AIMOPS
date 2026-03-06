// frontend/src/features/products/pages/ProductsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import { bulkDeleteProducts, getProducts, mergeProducts } from "../../../api/products";

import ProductsToolbar from "../components/ProductsToolbar";
import ProductsTable from "../components/ProductsTable";
import ProductsPager from "../components/ProductsPager";
import MergeProductsModal from "../components/MergeProductsModal";
import DeleteProductsModal from "../components/DeleteProductsModal";

import "./ProductsPage.css";

export default function ProductsPage() {
  const { t } = useTranslation("products");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(null);

  const [products, setProducts] = useState([]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState("all");
  const [suspicious, setSuspicious] = useState("all");
  const [hasSales, setHasSales] = useState("all");

  const [sortKey, setSortKey] = useState("product_id");
  const [sortDir, setSortDir] = useState("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [selected, setSelected] = useState(() => new Set());

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergePrimary, setMergePrimary] = useState(null);
  const [mergeIds, setMergeIds] = useState([]);
  const [mergeBusy, setMergeBusy] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const loadRef = useRef(0);

  const loadProducts = async () => {
    const seq = ++loadRef.current;
    setLoading(true);
    setErr("");
    setInfo(null);

    try {
      const res = await getProducts();
      if (seq !== loadRef.current) return;

      const list = Array.isArray(res?.products) ? res.products : [];
      setProducts(list);
      setSelected(new Set());
      setPage(1);
    } catch (e) {
      setErr(e?.message || t("page.errorLoadFailed"));
    } finally {
      if (seq === loadRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const s = new Set();
    for (const p of products) if (p?.category) s.add(p.category);
    return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return products.filter((p) => {
      const name = String(p?.product_name || "");
      const norm = String(p?.normalized_name || "");
      const cat = p?.category == null ? "" : String(p.category);
      const isActive = !!p?.is_active;
      const isSuspicious = !!p?.flags?.is_suspicious;
      const sales = Number(p?.stats?.total_sales || 0);

      if (qq) {
        const hay = `${name} ${norm} ${cat}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }

      if (category !== "all" && String(p?.category || "") !== category) return false;
      if (active === "active" && !isActive) return false;
      if (active === "inactive" && isActive) return false;
      if (suspicious === "suspicious" && !isSuspicious) return false;
      if (suspicious === "normal" && isSuspicious) return false;
      if (hasSales === "has" && sales <= 0) return false;
      if (hasSales === "none" && sales > 0) return false;

      return true;
    });
  }, [products, q, category, active, suspicious, hasSales]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const getVal = (p) => {
      switch (sortKey) {
        case "name":       return String(p?.product_name || "");
        case "category":   return String(p?.category || "");
        case "active":     return p?.is_active ? 1 : 0;
        case "suspicious": return p?.flags?.is_suspicious ? 1 : 0;
        case "sales":      return Number(p?.stats?.total_sales || 0);
        case "revenue":    return Number(p?.stats?.total_revenue || 0);
        case "last_sale":  return String(p?.stats?.last_sale || "");
        case "product_id":
        default:           return Number(p?.product_id || 0);
      }
    };

    return [...filtered].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / pageSize)), [sorted.length, pageSize]);
  const pageSafe = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageSafe, pageSize]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageAll = () => {
    const ids = pageItems.map((p) => p.product_id);
    const allOnPageSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const openMergeForSelection = () => {
    const ids = Array.from(selected);
    if (ids.length < 2) {
      setInfo({ type: "warning", text: t("page.warnMergeMinTwo") });
      return;
    }
    setMergePrimary(ids[0]);
    setMergeIds(ids.slice(1));
    setMergeOpen(true);
  };

  const openMergeForRow = (rowId) => {
    setMergePrimary(rowId);
    setMergeIds([]);
    setMergeOpen(true);
  };

  const doMerge = async () => {
    const primary = Number(mergePrimary);
    const merges = Array.from(new Set(mergeIds.map(Number))).filter((x) => x && x !== primary);

    if (!primary || merges.length === 0) {
      setInfo({ type: "warning", text: t("page.warnMergeChoose") });
      return;
    }

    setMergeBusy(true);
    setErr("");
    setInfo(null);

    try {
      const res = await mergeProducts({ primary_product_id: primary, merge_product_ids: merges });
      setInfo({ type: "success", text: res?.message || t("page.successMerge") });
      setMergeOpen(false);
      await loadProducts();
    } catch (e) {
      setErr(e?.message || t("page.errorMergeFailed"));
    } finally {
      setMergeBusy(false);
    }
  };

  const openDelete = () => {
    if (selected.size === 0) {
      setInfo({ type: "warning", text: t("page.warnDeleteSelect") });
      return;
    }
    setDelOpen(true);
  };

  const openDeleteForRow = (id) => {
    setSelected(new Set([id]));
    setDelOpen(true);
  };

  const selectedProducts = useMemo(() => {
    const map = new Map(products.map((p) => [p.product_id, p]));
    return Array.from(selected).map((id) => map.get(id)).filter(Boolean);
  }, [selected, products]);

  const anySelectedHasSales = useMemo(
    () => selectedProducts.some((p) => Number(p?.stats?.total_sales || 0) > 0),
    [selectedProducts]
  );

  const doDelete = async () => {
    const ids = Array.from(selected).map(Number).filter(Boolean);
    if (ids.length === 0) return;

    const force = anySelectedHasSales;

    setDelBusy(true);
    setErr("");
    setInfo(null);

    try {
      const res = await bulkDeleteProducts({ product_ids: ids, force });
      setInfo({ type: "success", text: res?.message || t("page.successDelete") });
      setDelOpen(false);
      await loadProducts();
    } catch (e) {
      setErr(e?.message || t("page.errorDeleteFailed"));
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <div className="products-page">
      <PageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle")}
      />

      {err ? <InfoMessage type="error">{err}</InfoMessage> : null}
      {info ? <InfoMessage type={info.type}>{info.text}</InfoMessage> : null}

      <Card>
        <ProductsToolbar
          loading={loading}
          resultsCount={sorted.length}
          selectedCount={selected.size}
          q={q}
          onQChange={(val) => { setQ(val); setPage(1); }}
          category={category}
          categories={categories}
          onCategoryChange={(val) => { setCategory(val); setPage(1); }}
          active={active}
          onActiveChange={(val) => { setActive(val); setPage(1); }}
          suspicious={suspicious}
          onSuspiciousChange={(val) => { setSuspicious(val); setPage(1); }}
          hasSales={hasSales}
          onHasSalesChange={(val) => { setHasSales(val); setPage(1); }}
          onRefresh={loadProducts}
          onMergeSelected={openMergeForSelection}
          onDeleteSelected={openDelete}
          canMerge={selected.size >= 2}
          canDelete={selected.size > 0}
        />

        <ProductsTable
          loading={loading}
          pageItems={pageItems}
          selected={selected}
          onTogglePageAll={togglePageAll}
          onToggleOne={toggleOne}
          onToggleSort={toggleSort}
          onMergeRow={openMergeForRow}
          onDeleteRow={openDeleteForRow}
        />

        <ProductsPager
          loading={loading}
          page={pageSafe}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageSizeChange={(val) => { setPageSize(val); setPage(1); }}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </Card>

      <MergeProductsModal
        open={mergeOpen}
        busy={mergeBusy}
        onClose={() => setMergeOpen(false)}
        onSubmit={doMerge}
        products={products}
        mergePrimary={mergePrimary}
        setMergePrimary={setMergePrimary}
        mergeIds={mergeIds}
        setMergeIds={setMergeIds}
      />

      <DeleteProductsModal
        open={delOpen}
        busy={delBusy}
        onClose={() => setDelOpen(false)}
        onSubmit={doDelete}
        selectedCount={selectedProducts.length}
        anyHasSales={anySelectedHasSales}
      />
    </div>
  );
}