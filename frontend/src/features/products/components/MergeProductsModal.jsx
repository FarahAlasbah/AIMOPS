import { useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { Button } from "../../../shared/components";

export default function MergeProductsModal({
  open,
  busy,
  onClose,
  onSubmit,
  products,
  mergePrimary,
  setMergePrimary,
  mergeIds,
  setMergeIds,
}) {
  const { t, i18n } = useTranslation("products");
  const pageDir = i18n.dir();

  const [primarySearch, setPrimarySearch] = useState("");
  const [mergeSearch, setMergeSearch] = useState("");

  const sortedProducts = useMemo(() =>
    [...products].sort((a, b) =>
      String(a.product_name || "").localeCompare(String(b.product_name || ""))
    ), [products]);

  const primaryOptions = useMemo(() => {
    const q = primarySearch.trim().toLowerCase();
    return q
      ? sortedProducts.filter((p) =>
          String(p.product_name || "").toLowerCase().includes(q)
        )
      : sortedProducts;
  }, [sortedProducts, primarySearch]);

  const mergeCandidates = useMemo(() => {
    const q = mergeSearch.trim().toLowerCase();
    return sortedProducts.filter((p) => {
      if (p.product_id === Number(mergePrimary)) return false;
      if (mergeIds.includes(p.product_id)) return false;
      if (!q) return true;
      return String(p.product_name || "").toLowerCase().includes(q);
    });
  }, [sortedProducts, mergePrimary, mergeIds, mergeSearch]);

  const selectedProducts = useMemo(
    () => mergeIds.map((id) => products.find((p) => p.product_id === id)).filter(Boolean),
    [mergeIds, products]
  );

  const handleAddMerge = (id) => {
    const numId = Number(id);
    if (!numId || numId === Number(mergePrimary)) return;
    setMergeIds((prev) => (prev.includes(numId) ? prev : [...prev, numId]));
    setMergeSearch("");
  };

  const handleRemoveMerge = (id) => setMergeIds((prev) => prev.filter((x) => x !== id));

  const canSubmit = !busy && mergePrimary && mergeIds.length > 0;

  return (
    <Modal
      title={t("mergeModal.title")}
      open={open}
      onClose={() => !busy && onClose()}
      // Pass a wide class or inline style to your Modal wrapper
      style={{ maxWidth: 700, width: "100%" }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("mergeModal.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {busy
              ? t("mergeModal.merging")
              : canSubmit
              ? t("mergeModal.mergeCount", { count: mergeIds.length })
              : t("mergeModal.merge")}
          </Button>
        </div>
      }
    >
      <div dir={pageDir} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Tip banner */}
        <p style={{
          margin: 0,
          padding: "10px 14px",
          borderRadius: "var(--border-radius-md)",
          background: "var(--surface-secondary, rgba(0,0,0,0.03))",
          fontSize: 13,
          color: "var(--color-text-secondary)",
          border: "0.5px solid var(--border-color, #e5e7eb)",
        }}>
          {t("mergeModal.tip")}
        </p>

        {/* Two columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 32px 1fr",
          gap: 0,
          alignItems: "start",
        }}>

          {/* ── Left: Primary ── */}
          <PanelBox label={t("mergeModal.primaryLabel")}>
            <input
              className="text"
              type="text"
              value={primarySearch}
              onChange={(e) => setPrimarySearch(e.target.value)}
              placeholder={t("mergeModal.primarySearchPlaceholder")}
              style={{ marginBottom: 8 }}
            />
            <div style={{
              maxHeight: 220,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}>
              {primaryOptions.map((p) => {
                const isSelected = p.product_id === Number(mergePrimary);
                return (
                  <div
                    key={p.product_id}
                    onClick={() => !busy && setMergePrimary(p.product_id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--border-radius-md)",
                      cursor: "pointer",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: isSelected
                        ? "var(--color-background-info, #EFF6FF)"
                        : "transparent",
                      border: isSelected
                        ? "1.5px solid var(--color-border-info, #93c5fd)"
                        : "1.5px solid transparent",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {isSelected && (
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "var(--color-text-info, #2563eb)",
                        flexShrink: 0,
                      }} />
                    )}
                    <bdi>{p.product_name}</bdi>
                  </div>
                );
              })}
            </div>
          </PanelBox>

          {/* ── Arrow divider ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 70 }}>
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    style={{ transform: "scaleX(-1)" }}
  >
    <path
      d="M3 9h12M11 5l4 4-4 4"
      stroke="var(--color-text-secondary, #9ca3af)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</div>

          {/* ── Right: Merge targets ── */}
          <PanelBox label={t("mergeModal.mergeIntoLabel")}>
            {/* Chip display area */}
            <div style={{
              minHeight: 52,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: 8,
              background: "var(--surface-primary, #fff)",
              border: "0.5px solid var(--border-color, #e5e7eb)",
              borderRadius: "var(--border-radius-md)",
              marginBottom: 10,
            }}>
              {selectedProducts.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", alignSelf: "center" }}>
                  {t("mergeModal.noProductsSelected")}
                </span>
              ) : selectedProducts.map((p) => (
                <span key={p.product_id} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--surface-secondary, rgba(0,0,0,0.04))",
                  border: "0.5px solid var(--border-color, #e5e7eb)",
                  fontSize: 13,
                  color: "var(--color-text-primary)",
                }}>
                  <bdi>{p.product_name}</bdi>
                  <button
                    type="button"
                    className="link"
                    onClick={() => handleRemoveMerge(p.product_id)}
                    disabled={busy}
                    style={{
                      fontSize: 14, lineHeight: 1,
                      color: "var(--color-text-secondary)",
                      padding: 0, background: "none", border: "none", cursor: "pointer",
                    }}
                  >✕</button>
                </span>
              ))}
            </div>

            {/* Search + scrollable list to add */}
            <input
              className="text"
              type="text"
              value={mergeSearch}
              onChange={(e) => setMergeSearch(e.target.value)}
              placeholder={t("mergeModal.addProductSearchPlaceholder")}
              style={{ marginBottom: 8 }}
            />
            <div style={{
              maxHeight: 130,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}>
              {mergeCandidates.map((p) => (
                <div
                  key={p.product_id}
                  onClick={() => !busy && handleAddMerge(p.product_id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--border-radius-md)",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  + <bdi>{p.product_name}</bdi>
                </div>
              ))}
              {mergeCandidates.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "6px 10px", margin: 0 }}>
                  {t("mergeModal.noMoreCandidates", "No more products to add")}
                </p>
              )}
            </div>
          </PanelBox>

        </div>
      </div>
    </Modal>
  );
}

function PanelBox({ label, children }) {
  return (
    <div style={{
      border: "0.5px solid var(--border-color, #e5e7eb)",
      borderRadius: "var(--border-radius-lg)",
      padding: 14,
      background: "var(--surface-secondary, rgba(0,0,0,0.02))",
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--color-text-secondary)",
        margin: "0 0 10px",
      }}>{label}</p>
      {children}
    </div>
  );
}