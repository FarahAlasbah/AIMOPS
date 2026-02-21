// frontend/src/features/data-upload/components/ReviewStep.jsx
import { useEffect, useMemo, useState } from "react";
import { Button, FormActions } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import "./ReviewStep.css";

const safeArr = (v) => (Array.isArray(v) ? v : []);
const uniq = (arr) => Array.from(new Set(arr));
const cleanStr = (v) => String(v ?? "").trim();

const getSelectedMerges = (productsDraft, normalized_name) => {
  const key = cleanStr(normalized_name);
  if (!key) return [];

  const found = safeArr(productsDraft).find(
    (x) => cleanStr(x?.normalized_name) === key,
  );

  return uniq(
    safeArr(found?.merge_with)
      .map(cleanStr)
      .filter(Boolean),
  );
};

function MergeModal({
  open,
  product,
  candidates,
  selected,
  locked,
  onToggle,
  onClose,
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter((c) => c.toLowerCase().includes(s));
  }, [q, candidates]);

  if (!open || !product) return null;

  return (
    <div
      className="merge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Manage merges"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="merge-modal">
        <div className="merge-modal-head">
          <div className="merge-modal-title">Manage merges</div>
          <button type="button" className="merge-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="merge-modal-sub">
          <div className="merge-product-name">{product.primary_name}</div>
          <div className="merge-product-meta" title={product.normalized_name}>
            Normalized: {product.normalized_name}
          </div>
        </div>

        <div className="merge-section">
          <div className="merge-section-title">
            Selected merges <span className="muted">({selected.length})</span>
          </div>

          {selected.length === 0 ? (
            <div className="merge-empty">No merges selected.</div>
          ) : (
            <div className="merge-selected">
              {selected.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="selected-chip"
                  onClick={() => onToggle(name)}
                  disabled={locked}
                  title="Remove"
                >
                  {name}
                  <span className="x">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="merge-section">
          <div className="merge-section-title">
            Candidates <span className="muted">({candidates.length})</span>
          </div>

          <div className="merge-search-row">
            <input
              className="merge-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search candidates..."
              disabled={locked}
            />
            <div className="merge-count">{filtered.length} shown</div>
          </div>

          {candidates.length === 0 ? (
            <div className="merge-empty">No other product names found in this batch.</div>
          ) : filtered.length === 0 ? (
            <div className="merge-empty">No matches.</div>
          ) : (
            <div className="merge-list">
              {filtered.map((name) => {
                const active = selected.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className={`merge-item ${active ? "active" : ""}`}
                    onClick={() => onToggle(name)}
                    disabled={locked}
                    aria-pressed={active}
                    title={active ? "Remove" : "Add"}
                  >
                    <span className="merge-item-text">{name}</span>
                    <span className="merge-item-action">{active ? "Remove" : "Add"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="merge-modal-foot">
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewStep({
  confirmResult,
  confirmedMappings,
  extracting,
  extractResult,
  productsDraft,
  confirmProductsResult,
  confirmingProducts,
  onExtract,
  onToggleMerge,
  onConfirmProducts,
  onBack,
  onFinish,
}) {
  const [activeNorm, setActiveNorm] = useState("");
  const locked = !!confirmProductsResult?.success;

  const extractedProducts = useMemo(() => {
    const list = Array.isArray(extractResult?.products) ? extractResult.products : [];
    return list
      .map((p) => ({
        primary_name: cleanStr(p?.primary_name),
        normalized_name: cleanStr(p?.normalized_name),
        category: p?.category == null ? "" : cleanStr(p?.category),
      }))
      .filter((p) => p.primary_name && p.normalized_name);
  }, [extractResult]);

  const byNorm = useMemo(() => {
    const m = new Map();
    extractedProducts.forEach((p) => m.set(p.normalized_name, p));
    return m;
  }, [extractedProducts]);

  const allPrimaryNames = useMemo(() => {
    return uniq(extractedProducts.map((p) => p.primary_name)).filter(Boolean);
  }, [extractedProducts]);

  const extractedCount = extractedProducts.length;

  const mergedTotal = useMemo(() => {
    return safeArr(productsDraft).reduce((acc, p) => {
      const merges = safeArr(p?.merge_with).map(cleanStr).filter(Boolean);
      return acc + merges.length;
    }, 0);
  }, [productsDraft]);

  const canShowExtracted = !!extractResult?.success && extractedCount > 0;

  const activeProduct = activeNorm ? byNorm.get(activeNorm) : null;
  const activeSelected = useMemo(() => {
    if (!activeProduct) return [];
    return getSelectedMerges(productsDraft, activeProduct.normalized_name);
  }, [productsDraft, activeProduct]);

  const activeCandidates = useMemo(() => {
    if (!activeProduct) return [];
    return allPrimaryNames.filter((n) => n !== activeProduct.primary_name);
  }, [allPrimaryNames, activeProduct]);

  return (
    <div className="review-step">
      <div className="review-header">
        <div>
          <div className="review-title">Merge duplicates, then confirm products</div>
          <div className="review-sub">
            {extractResult?.success
              ? `${extractedCount} products extracted • ${mergedTotal} merges selected`
              : "Extract products from this batch first"}
          </div>
        </div>

        <div className="review-header-right">
          {confirmResult?.success ? (
            <span className="badge ok">
              Mappings confirmed ({Array.isArray(confirmedMappings) ? confirmedMappings.length : 0})
            </span>
          ) : (
            <span className="badge warn">Mappings not found</span>
          )}

          {extractResult?.success ? (
            <span className="badge ok">Extracted</span>
          ) : (
            <span className="badge muted">Not extracted</span>
          )}
        </div>
      </div>

      {confirmProductsResult?.success && (
        <InfoMessage type="success">Products confirmed successfully. You can finish now.</InfoMessage>
      )}

      {!extractResult?.success && (
        <div className="top-actions">
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>

          <Button type="button" onClick={onExtract} disabled={extracting}>
            {extracting ? "Extracting..." : "Extract products"}
          </Button>
        </div>
      )}

      {extractResult?.success && !canShowExtracted && (
        <InfoMessage type="info">No products were extracted from this batch.</InfoMessage>
      )}

      {canShowExtracted && (
        <>
          <div className="products-list">
            {extractedProducts.map((p) => {
              const selected = getSelectedMerges(productsDraft, p.normalized_name);

              return (
                <div className="product-row" key={p.normalized_name}>
                  <div className="product-main">
                    <div className="product-name">{p.primary_name}</div>
                    <div className="product-meta">
                      <span>Category: {p.category || "—"}</span>
                      <span className="sep">•</span>
                      <span title={p.normalized_name}>Normalized: {p.normalized_name}</span>
                    </div>

                    {selected.length > 0 ? (
                      <div className="selected-wrap">
                        {selected.slice(0, 4).map((v) => (
                          <span key={v} className="selected-chip readonly" title={v}>
                            {v}
                          </span>
                        ))}
                        {selected.length > 4 ? (
                          <span className="more-chip">+{selected.length - 4} more</span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="selected-empty">No merges selected</div>
                    )}
                  </div>

                  <div className="product-actions">
                    <button
                      type="button"
                      className="manage-btn"
                      onClick={() => setActiveNorm(p.normalized_name)}
                      disabled={locked}
                      title={locked ? "Already confirmed" : ""}
                    >
                      Manage merges
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <FormActions>
            <Button type="button" variant="secondary" onClick={onBack}>
              Back
            </Button>

            <div className="right-actions">
              <Button
                type="button"
                onClick={onConfirmProducts}
                disabled={confirmingProducts || locked}
              >
                {locked ? "Confirmed" : confirmingProducts ? "Confirming..." : "Confirm products"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={onFinish}
                disabled={!locked}
              >
                Finish
              </Button>
            </div>
          </FormActions>

          <MergeModal
            open={!!activeNorm}
            product={activeProduct}
            candidates={activeCandidates}
            selected={activeSelected}
            locked={locked}
            onToggle={(name) => onToggleMerge(activeProduct?.normalized_name, name)}
            onClose={() => setActiveNorm("")}
          />
        </>
      )}
    </div>
  );
}
