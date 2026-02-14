// frontend/src/features/data-upload/components/ReviewStep.jsx
import { useMemo, useRef, useState } from "react";
import { Button, FormActions } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import { ProductsListSkeleton, ConfirmProductsSkeleton } from "./Skeletons";

const money = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(2);
};

function ProductCard({ product, draft, expanded, onToggleExpand, onToggleMerge }) {
  const normalized = product?.normalized_name || "";
  const primaryName = product?.primary_name || "-";
  const stats = product?.stats || {};

  const variations = Array.isArray(product?.name_variations) ? product.name_variations : [];
  const possibleTypos = Array.isArray(product?.possible_typos) ? product.possible_typos : [];

  const category = (draft?.category ?? product?.category ?? "") || "";
  const mergeWith = Array.isArray(draft?.merge_with) ? draft.merge_with : [];

  const mergeCandidates = variations
    .map((v) => String(v))
    .filter((v) => v && v !== String(product?.primary_name ?? ""));

  const hasTypos = possibleTypos.length > 0;
  const hasVariations = mergeCandidates.length > 0;

  const toggleAll = () => {
    const allSelected =
      mergeCandidates.length > 0 && mergeCandidates.every((v) => mergeWith.includes(v));

    mergeCandidates.forEach((v) => {
      const shouldSelect = !allSelected;
      const isSelected = mergeWith.includes(v);
      if (shouldSelect && !isSelected) onToggleMerge(normalized, v);
      if (!shouldSelect && isSelected) onToggleMerge(normalized, v);
    });
  };

  return (
    <div className="mapping-card" style={{ marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: "#111827", wordBreak: "break-word" }}>
            {primaryName}
          </div>

          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, wordBreak: "break-word" }}>
            {normalized}
          </div>

          <div className="chip-row" style={{ marginTop: 8 }}>
            <span className="chip">Occ: {stats?.occurrences ?? "-"}</span>
            <span className="chip">Qty: {stats?.total_quantity ?? "-"}</span>
            <span className="chip">Rev: {money(stats?.total_revenue)}</span>

            {category ? (
              <span className="chip good">Category: {category}</span>
            ) : (
              <span className="chip warn">Category: -</span>
            )}

            {hasVariations ? <span className="chip warn">Variations</span> : null}
            {hasTypos ? <span className="chip warn">Typos</span> : null}
            {mergeWith.length > 0 ? <span className="chip good">Merges: {mergeWith.length}</span> : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="ghost-btn"
            onClick={onToggleExpand}
            style={{ whiteSpace: "nowrap" }}
          >
            {expanded ? "Collapse" : "Merge"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="meta-grid" style={{ marginTop: 10 }}>
            <div className="meta-item">
              <div className="meta-label">Occurrences</div>
              <div className="meta-value">{stats?.occurrences ?? "-"}</div>
            </div>

            <div className="meta-item">
              <div className="meta-label">Total quantity</div>
              <div className="meta-value">{stats?.total_quantity ?? "-"}</div>
            </div>

            <div className="meta-item">
              <div className="meta-label">Total revenue</div>
              <div className="meta-value">{money(stats?.total_revenue)}</div>
            </div>

            <div className="meta-item" style={{ gridColumn: "1 / -1" }}>
              <div className="meta-label">Date range</div>
              <div className="meta-value">{stats?.date_range ?? "-"}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="meta-label" style={{ marginBottom: 6 }}>
              Merge variations (only action)
            </div>

            {mergeCandidates.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>No variations detected.</div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <button type="button" className="ghost-btn" onClick={toggleAll}>
                    {mergeCandidates.every((v) => mergeWith.includes(v)) ? "Clear all" : "Select all"}
                  </button>

                  {mergeWith.length > 0 ? (
                    <div style={{ fontSize: 13, color: "#6b7280", alignSelf: "center" }}>
                      Selected merges: <strong style={{ color: "#111827" }}>{mergeWith.length}</strong>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {mergeCandidates.map((v) => {
                    const checked = mergeWith.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onToggleMerge(normalized, v)}
                        className={`role-pill ${checked ? "active" : ""}`}
                        aria-pressed={checked}
                        title="Toggle merge"
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {possibleTypos.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="meta-label" style={{ marginBottom: 6 }}>
                Possible typos (read-only)
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                {possibleTypos.slice(0, 8).map((t, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 10,
                      background: "#fff",
                      fontSize: 13,
                      color: "#111827",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{t?.product ?? "-"}</div>
                    <div style={{ color: "#6b7280", marginTop: 4 }}>
                      edit_distance: {t?.edit_distance ?? "-"} • {t?.suggestion ?? ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReviewStep({
  batchId,

  confirmResult,
  confirmedMappings,

  extracting,
  extractResult,

  productsDraft,
  onToggleMerge,

  confirmingProducts,
  confirmProductsResult,

  onExtract,
  onConfirmProducts,

  onBack,
  onFinish,
}) {
  const products = Array.isArray(extractResult?.products) ? extractResult.products : [];

  const draftByNorm = {};
  (productsDraft || []).forEach((p) => {
    if (p?.normalized_name) draftByNorm[String(p.normalized_name)] = p;
  });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});

  const confirmRef = useRef(null);

  const confirmDisabled =
    confirmingProducts || !extractResult?.success || !!confirmProductsResult?.success;

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    const list = products || [];

    return list.filter((p) => {
      const primary = String(p?.primary_name || "").toLowerCase();
      const norm = String(p?.normalized_name || "").toLowerCase();
      const variations = Array.isArray(p?.name_variations) ? p.name_variations : [];
      const possibleTypos = Array.isArray(p?.possible_typos) ? p.possible_typos : [];

      const draft = draftByNorm[String(p?.normalized_name || "")];
      const category = String(draft?.category ?? p?.category ?? "").trim();

      const mergeCandidates = variations
        .map((v) => String(v))
        .filter((v) => v && v !== String(p?.primary_name ?? ""));

      const matchesQuery =
        !q ||
        primary.includes(q) ||
        norm.includes(q) ||
        variations.some((v) => String(v).toLowerCase().includes(q));

      if (!matchesQuery) return false;

      if (filter === "typos") return possibleTypos.length > 0;
      if (filter === "variations") return mergeCandidates.length > 0;
      if (filter === "no_category") return !category;

      return true;
    });
  }, [products, query, filter, draftByNorm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const setExpandedForPage = (value) => {
    const next = { ...expanded };
    pageItems.forEach((p) => {
      const k = String(p?.normalized_name || "");
      if (!k) return;
      next[k] = value;
    });
    setExpanded(next);
  };

  const scrollToConfirm = () => {
    const el = confirmRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleFilterChange = (v) => {
    setFilter(v);
    setPage(1);
  };
  const handleQueryChange = (v) => {
    setQuery(v);
    setPage(1);
  };
  const handlePageSizeChange = (v) => {
    const n = Number(v);
    setPageSize(Number.isNaN(n) ? 20 : n);
    setPage(1);
  };

  const showExtractButton = !extractResult?.success && !confirmProductsResult?.success;

  const showProductsSkeleton = extracting && !extractResult?.success;
  const showConfirmSkeleton = confirmingProducts && !confirmProductsResult?.success;

  return (
    <div style={{ padding: 12, position: "relative" }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
        Products
      </h3>

      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
        Batch ID: <strong style={{ color: "#111827" }}>{batchId}</strong>
      </div>

      {confirmResult?.success ? (
        <div style={{ marginBottom: 12 }}>
          <InfoMessage type="success">
            Mappings saved:{" "}
            {confirmResult.mappings_saved ??
              (Array.isArray(confirmedMappings) ? confirmedMappings.length : 0)}
          </InfoMessage>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <InfoMessage type="warn">Mappings are not saved for this batch on this device.</InfoMessage>
        </div>
      )}

      <div className="mapping-card" style={{ marginTop: 10 }}>
        <div className="mapping-title">Step 1: Extract products</div>
        <div className="mapping-sub">This finds unique products and variations from your uploaded file.</div>

        {extracting ? (
          <div style={{ marginTop: 10 }}>
            <div className="skeleton skeleton-line" style={{ height: 12, width: 180 }} />
            <div style={{ marginTop: 10 }}>
              <div className="skeleton" style={{ height: 8, width: "100%", borderRadius: 999 }} />
            </div>
          </div>
        ) : null}

        {extractResult?.success && (
          <div style={{ marginTop: 10 }}>
            <InfoMessage type="success">
              {extractResult.message ||
                `Extracted ${
                  extractResult.total_unique_products ?? products.length
                } unique products`}
            </InfoMessage>
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {showExtractButton ? (
            <Button
              variant="secondary"
              onClick={onExtract}
              disabled={!confirmResult?.success || extracting}
            >
              {extracting ? "Extracting..." : "Extract products"}
            </Button>
          ) : null}

          {extractResult?.success ? (
            <button type="button" className="ghost-btn" onClick={scrollToConfirm}>
              Jump to confirm
            </button>
          ) : null}
        </div>
      </div>

      {showProductsSkeleton ? <ProductsListSkeleton count={6} /> : null}

      {extractResult?.success && (
        <div style={{ marginTop: 14 }}>
          <div className="mapping-card" style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: "1 1 240px", minWidth: 220 }}>
                <div className="meta-label" style={{ marginBottom: 6 }}>
                  Search
                </div>
                <input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search by name..."
                  style={{
                    width: "100%",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 13,
                    color: "#111827",
                  }}
                />
              </div>

              <div style={{ flex: "0 0 220px", minWidth: 200 }}>
                <div className="meta-label" style={{ marginBottom: 6 }}>
                  Filter
                </div>
                <select
                  value={filter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  style={{
                    width: "100%",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 13,
                    color: "#111827",
                    background: "#fff",
                  }}
                >
                  <option value="all">All</option>
                  <option value="no_category">No category</option>
                  <option value="variations">Has variations</option>
                  <option value="typos">Has typos</option>
                </select>
              </div>

              <div style={{ flex: "0 0 140px" }}>
                <div className="meta-label" style={{ marginBottom: 6 }}>
                  Page size
                </div>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  style={{
                    width: "100%",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 13,
                    color: "#111827",
                    background: "#fff",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Showing <strong style={{ color: "#111827" }}>{pageItems.length}</strong> of{" "}
                <strong style={{ color: "#111827" }}>{filtered.length}</strong> products
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="ghost-btn" onClick={() => setExpandedForPage(true)}>
                  Expand page
                </button>
                <button type="button" className="ghost-btn" onClick={() => setExpandedForPage(false)}>
                  Collapse page
                </button>
                <button type="button" className="ghost-btn" onClick={scrollToConfirm}>
                  Jump to confirm
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                className="pager-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                Prev
              </button>

              <div className="pager-page">
                Page {safePage} / {totalPages}
              </div>

              <button
                className="pager-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </button>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            {pageItems.map((p) => {
              const key = String(p?.normalized_name || p?.primary_name || "");
              const isOpen = !!expanded[key];

              return (
                <ProductCard
                  key={key}
                  product={p}
                  draft={draftByNorm[String(p?.normalized_name || "")]}
                  expanded={isOpen}
                  onToggleExpand={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                  onToggleMerge={onToggleMerge}
                />
              );
            })}
          </div>

          <div ref={confirmRef} style={{ marginTop: 16 }}>
            {showConfirmSkeleton ? (
              <ConfirmProductsSkeleton />
            ) : (
              <div className="mapping-card">
                <div className="mapping-title">Step 2: Confirm products</div>
                <div className="mapping-sub">This will import your sales records using your merge decisions.</div>

                {confirmProductsResult?.success && (
                  <div style={{ marginTop: 10 }}>
                    <InfoMessage type="success">
                      {confirmProductsResult.message || "Products confirmed."}
                    </InfoMessage>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <Button variant="primary" onClick={onConfirmProducts} disabled={confirmDisabled}>
                    {confirmingProducts
                      ? "Confirming..."
                      : confirmProductsResult?.success
                      ? "Confirmed"
                      : "Confirm products"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <FormActions>
        <Button variant="secondary" onClick={onBack} disabled={extracting || confirmingProducts}>
          Back
        </Button>

        <Button variant="primary" onClick={onFinish} disabled={!confirmProductsResult?.success}>
          Finish
        </Button>
      </FormActions>
    </div>
  );
}
