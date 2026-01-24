import './FormInput.css';

const FormTextarea = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  rows = 4,
  required = false,
  disabled = false,
  error,
  ...props 
}) => {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <textarea
        className={`form-textarea ${error ? 'error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        disabled={disabled}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default FormTextarea;