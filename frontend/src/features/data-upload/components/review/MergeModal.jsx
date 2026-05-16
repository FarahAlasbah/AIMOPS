import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function MergeModal({
  open,
  product,
  candidates,
  selected,
  locked,
  onSave,
  onClose,
}) {
  const { t } = useTranslation("upload");

  const [query, setQuery] = useState("");
  const [localSelected, setLocalSelected] = useState([]);

  useEffect(() => {
    if (!open) return undefined;

    setQuery("");
    setLocalSelected(selected || []);

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, selected, onClose]);

  const filteredCandidates = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return candidates;

    return candidates.filter((candidate) =>
      candidate.toLowerCase().includes(search),
    );
  }, [query, candidates]);

  const toggleLocal = (name) => {
    if (locked) return;

    setLocalSelected((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name],
    );
  };

  const handleDone = () => {
    if (locked) {
      onClose?.();
      return;
    }

    onSave?.(localSelected);
  };

  if (!open || !product) return null;

  return (
    <div
      className="merge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("review.modal.title")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="merge-modal">
        <div className="merge-modal-head">
          <div className="merge-modal-title">{t("review.modal.title")}</div>

          <div className="merge-modal-head-actions">
            <button
              type="button"
              className="merge-head-btn secondary"
              onClick={onClose}
            >
              {t("review.modal.close")}
            </button>

            <button
              type="button"
              className="merge-head-btn primary"
              onClick={handleDone}
              disabled={locked}
            >
              {t("review.modal.done")}
            </button>
          </div>
        </div>

        <div className="merge-product-highlight">
          <div className="merge-product-highlight-label">
            {t("review.product", {
              defaultValue: "Product",
            })}
          </div>

          <div className="merge-product-highlight-name">
            {product.primary_name}
          </div>
        </div>

        <div className="merge-section">
          <div className="merge-section-title">
            {t("review.modal.selectedMerges")}{" "}
            <span className="muted">({localSelected.length})</span>
          </div>

          {localSelected.length === 0 ? (
            <div className="merge-empty">
              {t("review.modal.noMergesSelected")}
            </div>
          ) : (
            <div className="merge-selected">
              {localSelected.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="selected-chip"
                  onClick={() => toggleLocal(name)}
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
            {t("review.modal.candidates")}{" "}
            <span className="muted">({candidates.length})</span>
          </div>

          <div className="merge-search-row">
            <input
              className="merge-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("review.modal.searchPlaceholder")}
              disabled={locked}
            />

            <div className="merge-count">
              {t("review.modal.shown", {
                count: filteredCandidates.length,
              })}
            </div>
          </div>

          {candidates.length === 0 ? (
            <div className="merge-empty">{t("review.modal.noCandidates")}</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="merge-empty">{t("review.modal.noMatches")}</div>
          ) : (
            <div className="merge-list">
              {filteredCandidates.map((name) => {
                const active = localSelected.includes(name);

                return (
                  <button
                    key={name}
                    type="button"
                    className={`merge-item ${active ? "active" : ""}`}
                    onClick={() => toggleLocal(name)}
                    disabled={locked}
                    aria-pressed={active}
                    title={
                      active ? t("review.modal.remove") : t("review.modal.add")
                    }
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
      </div>
    </div>
  );
}