// frontend/src/features/data-upload/components/ReviewStep.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FormActions } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import "./ReviewStep.css";

const safeArr = (v) => (Array.isArray(v) ? v : []);
const uniq = (arr) => Array.from(new Set(arr));
const cleanStr = (v) => String(v ?? "").trim();

const getSelectedMerges = (productsDraft, normalized_name) => {
  const key = cleanStr(normalized_name);
  if (!key) return [];
  const found = safeArr(productsDraft).find((x) => cleanStr(x?.normalized_name) === key);
  return uniq(safeArr(found?.merge_with).map(cleanStr).filter(Boolean));
};

function MergeModal({ open, product, candidates, selected, locked, onToggle, onClose }) {
  const { t } = useTranslation("upload");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? candidates.filter((c) => c.toLowerCase().includes(s)) : candidates;
  }, [q, candidates]);

  if (!open || !product) return null;

  return (
    <div
      className="merge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("review.modal.title")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="merge-modal">
        <div className="merge-modal-head">
          <div className="merge-modal-title">{t("review.modal.title")}</div>
          <button type="button" className="merge-close" onClick={onClose}>
            {t("review.modal.close")}
          </button>
        </div>

        <div className="merge-modal-sub">
          <div className="merge-product-name">{product.primary_name}</div>
          <div className="merge-product-meta" title={product.normalized_name}>
            {t("review.modal.normalizedLabel")} {product.normalized_name}
          </div>
        </div>

        <div className="merge-section">
          <div className="merge-section-title">
            {t("review.modal.selectedMerges")} <span className="muted">({selected.length})</span>
          </div>
          {selected.length === 0 ? (
            <div className="merge-empty">{t("review.modal.noMergesSelected")}</div>
          ) : (
            <div className="merge-selected">
              {selected.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="selected-chip"
                  onClick={() => onToggle(name)}
                  disabled={locked}
                  title={t("review.modal.remove")}
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
            {t("review.modal.candidates")} <span className="muted">({candidates.length})</span>
          </div>
          <div className="merge-search-row">
            <input
              className="merge-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("review.modal.searchPlaceholder")}
              disabled={locked}
            />
            <div className="merge-count">{t("review.modal.shown", { count: filtered.length })}</div>
          </div>

          {candidates.length === 0 ? (
            <div className="merge-empty">{t("review.modal.noCandidates")}</div>
          ) : filtered.length === 0 ? (
            <div className="merge-empty">{t("review.modal.noMatches")}</div>
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
                    title={active ? t("review.modal.remove") : t("review.modal.add")}
                  >
                    <span className="merge-item-text">{name}</span>
                    <span className="merge-item-action">
                      {active ? t("review.modal.remove") : t("review.modal.add")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="merge-modal-foot">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("review.modal.done")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewStep({
  confirmMappingsResult,
  products,
  productsDraft,
  confirmProductsResult,
  confirmingProducts,
  alreadyProcessed = false,
  onToggleMerge,
  onConfirmProducts,
  onBack,
  onFinish,
}) {
  const { t } = useTranslation("upload");
  const [activeNorm, setActiveNorm] = useState("");

  const locked = !!confirmProductsResult?.success || !!alreadyProcessed;

  const allPrimaryNames = useMemo(
    () => uniq(safeArr(products).map((p) => p.primary_name)).filter(Boolean),
    [products]
  );

  const byNorm = useMemo(() => {
    const m = new Map();
    safeArr(products).forEach((p) => m.set(p.normalized_name, p));
    return m;
  }, [products]);

  const mergedTotal = useMemo(
    () => safeArr(productsDraft).reduce((acc, p) => acc + safeArr(p?.merge_with).filter(Boolean).length, 0),
    [productsDraft]
  );

  const activeProduct = activeNorm ? byNorm.get(activeNorm) : null;
  const activeSelected = useMemo(
    () => (activeProduct ? getSelectedMerges(productsDraft, activeProduct.normalized_name) : []),
    [productsDraft, activeProduct]
  );
  const activeCandidates = useMemo(
    () => (activeProduct ? allPrimaryNames.filter((n) => n !== activeProduct.primary_name) : []),
    [allPrimaryNames, activeProduct]
  );

  const productCount = safeArr(products).length;
  const hasProducts = productCount > 0;

  return (
    <div className="review-step">
      <div className="review-header">
        <div>
          <div className="review-title">{t("review.title")}</div>
          <div className="review-sub">
            {hasProducts
              ? t("review.subExtracted", { count: productCount, merges: mergedTotal })
              : t("review.subNotExtracted")}
          </div>
        </div>

        <div className="review-header-right">
          {confirmMappingsResult?.success ? (
            <span className="badge ok">
              {t("review.mappingsConfirmed", {
                count: safeArr(confirmMappingsResult?.confirmed_mappings).length,
              })}
            </span>
          ) : (
            <span className="badge warn">{t("review.mappingsNotFound")}</span>
          )}

          <span className={`badge ${hasProducts ? "ok" : "muted"}`}>
            {hasProducts ? t("review.badgeExtracted") : t("review.badgeNotExtracted")}
          </span>
        </div>
      </div>

      {confirmProductsResult?.success && (
        <InfoMessage type="success">{t("review.productsConfirmedSuccess")}</InfoMessage>
      )}

      {!hasProducts && (
        <FormActions>
          <Button type="button" variant="secondary" onClick={onBack}>
            {t("review.back")}
          </Button>
          <Button type="button" variant="secondary" onClick={onFinish} disabled={!locked}>
            {t("review.finish")}
          </Button>
        </FormActions>
      )}

      {hasProducts && (
        <>
          <div className="products-list">
            {safeArr(products).map((p) => {
              const selected = getSelectedMerges(productsDraft, p.normalized_name);

              return (
                <div className="product-row" key={p.normalized_name}>
                  <div className="product-main">
                    <div className="product-name">{p.primary_name}</div>

                    <div className="product-meta">
                      <span>{t("review.category")} {p.category || "—"}</span>
                      <span className="sep">•</span>
                      <span title={p.normalized_name}>
                        {t("review.normalized")} {p.normalized_name}
                      </span>
                    </div>

                    {safeArr(p.possible_typos).length > 0 && (
                      <div className="product-typos">
                        {p.possible_typos.map((typo) => (
                          <span key={typo.product} className="typo-chip" title={typo.suggestion}>
                            ⚠ {typo.product}
                          </span>
                        ))}
                      </div>
                    )}

                    {selected.length > 0 ? (
                      <div className="selected-wrap">
                        {selected.slice(0, 4).map((v) => (
                          <span key={v} className="selected-chip readonly" title={v}>
                            {v}
                          </span>
                        ))}
                        {selected.length > 4 && (
                          <span className="more-chip">+{selected.length - 4} more</span>
                        )}
                      </div>
                    ) : (
                      <div className="selected-empty">{t("review.noMergesSelected")}</div>
                    )}
                  </div>

                  <div className="product-actions">
                    <button
                      type="button"
                      className="manage-btn"
                      onClick={() => setActiveNorm(p.normalized_name)}
                      disabled={locked}
                      title={locked ? t("review.alreadyConfirmed") : ""}
                    >
                      {t("review.manageMerges")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <FormActions>
            <Button type="button" variant="secondary" onClick={onBack}>
              {t("review.back")}
            </Button>

            <div className="right-actions">
              <Button type="button" onClick={onConfirmProducts} disabled={confirmingProducts || locked}>
                {locked
                  ? alreadyProcessed && !confirmProductsResult?.success
                    ? t("review.alreadyProcessed", { defaultValue: "Already processed" })
                    : t("review.confirmed")
                  : confirmingProducts
                  ? t("review.confirmingProducts")
                  : t("review.confirmProducts")}
              </Button>

              <Button type="button" variant="secondary" onClick={onFinish} disabled={!locked}>
                {t("review.finish")}
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