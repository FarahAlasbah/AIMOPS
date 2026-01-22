import './FormInput.css'; // Re-use base input styles
import './FormCalendar.css';

const FormCalendar = ({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  required = false, 
  disabled = false, 
  error,
  placeholder,
  ...props 
}) => {
  return (
    <div className="form-group form-calendar">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <input
        type="date"
        className={`form-input ${error ? 'error' : ''}`}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default FormCalendar;