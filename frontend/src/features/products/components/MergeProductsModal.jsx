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
  return (
    <Modal
      title="Merge products"
      open={open}
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={busy}>
            {busy ? "Merging..." : "Merge"}
          </Button>
        </>
      }
    >
      <div className="modal-grid">
        <div className="field">
          <label>Primary product</label>
          <select
            className="text"
            value={mergePrimary ?? ""}
            onChange={(e) => setMergePrimary(Number(e.target.value))}
          >
            <option value="" disabled>
              Select primary...
            </option>
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                #{p.product_id} — {p.product_name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Products to merge into primary</label>

          <div className="picklist">
            {mergeIds.length === 0 ? (
              <div className="muted">No products selected yet.</div>
            ) : (
              <ul>
                {mergeIds.map((id) => {
                  const p = products.find((x) => x.product_id === id);
                  return (
                    <li key={id}>
                      <span>
                        #{id} — {p?.product_name || "-"}
                      </span>
                      <button
                        className="link"
                        onClick={() => setMergeIds((prev) => prev.filter((x) => x !== id))}
                        type="button"
                      >
                        remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label>Add product to merge</label>
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
              <option value="">Select product...</option>
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
            Tip: select products in the table, then click “Merge selected”.
          </div>
        </div>
      </div>
    </Modal>
  );
}
