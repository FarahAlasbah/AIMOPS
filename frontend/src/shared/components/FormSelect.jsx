import './FormInput.css';

const FormSelect = ({ 
  label, 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select an option',
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
      <select
        className={`form-select ${error ? 'error' : ''}`}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default FormSelect;