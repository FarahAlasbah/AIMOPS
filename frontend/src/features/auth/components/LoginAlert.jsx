const LoginAlert = ({ message, onClose, closeLabel }) => {
  if (!message) return null;

  return (
    <div className="alert alert-error" role="alert" aria-live="polite">
      <div className="alert-text">{message}</div>

      <button
        type="button"
        className="alert-close"
        onClick={onClose}
        aria-label={closeLabel}
      >
        ×
      </button>
    </div>
  );
};

export default LoginAlert;