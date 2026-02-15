// frontend/src/features/products/components/DeleteProductsModal.jsx

import Modal from "./Modal";
import { Button } from "../../../shared/components";
import DangerButton from "./DangerButton";

export default function DeleteProductsModal({
  open,
  busy,
  onClose,
  onSubmit,
  selectedCount,
  anyHasSales,
}) {
  return (
    <Modal
      title="Delete products"
      open={open}
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <DangerButton onClick={onSubmit} disabled={busy}>
            {busy ? "Deleting..." : "Delete"}
          </DangerButton>
        </>
      }
    >
      <div>
        <div className="muted">
          You are deleting <b>{selectedCount}</b> product(s).
        </div>

        {anyHasSales ? (
          <div className="warn-box" style={{ marginTop: 10 }}>
            Some selected products have sales.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
