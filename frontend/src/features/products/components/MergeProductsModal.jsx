// frontend/src/features/products/components/MergeProductsModal.jsx
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

  return (
    <Modal
      title={t("mergeModal.title")}
      open={open}
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("mergeModal.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={busy}>
            {busy ? t("mergeModal.merging") : t("mergeModal.merge")}
          </Button>
        </>
      }
    >
      <div className="modal-grid" dir={pageDir}>
        <div className="field">
          <label>{t("mergeModal.primaryLabel")}</label>
          <select
            className="text"
            value={mergePrimary ?? ""}
            onChange={(e) => setMergePrimary(Number(e.target.value))}
          >
            <option value="" disabled>
              {t("mergeModal.primaryPlaceholder")}
            </option>
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                #{p.product_id} — {p.product_name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{t("mergeModal.mergeIntoLabel")}</label>

          <div className="picklist">
            {mergeIds.length === 0 ? (
              <div className="muted">{t("mergeModal.noProductsSelected")}</div>
            ) : (
              <ul>
                {mergeIds.map((id) => {
                  const p = products.find((x) => x.product_id === id);
                  return (
                    <li key={id}>
                      <span>
                        <span>#{id}</span> — <bdi>{p?.product_name || "-"}</bdi>
                      </span>
                      <button
                        className="link"
                        onClick={() => setMergeIds((prev) => prev.filter((x) => x !== id))}
                        type="button"
                      >
                        {t("mergeModal.removeProduct")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label>{t("mergeModal.addProductLabel")}</label>
            <select
              className="text"
              value=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (!id) return;
                if (id === Number(mergePrimary)) return;
                setMergeIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              }}
            >
              <option value="">{t("mergeModal.addProductPlaceholder")}</option>
              {products
                .filter((p) => p.product_id !== Number(mergePrimary))
                .map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    #{p.product_id} — {p.product_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            {t("mergeModal.tip")}
          </div>
        </div>
      </div>
    </Modal>
  );
}