// frontend/src/features/products/components/Modal.jsx

export default function Modal({ title, open, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-x" onClick={onClose} aria-label="Close" type="button">
            ×
          </button>
        </div>

        <div className="modal-body">{children}</div>

        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}
