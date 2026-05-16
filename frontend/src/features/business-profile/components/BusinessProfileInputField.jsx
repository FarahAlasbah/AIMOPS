export default function BusinessProfileInputField({
  label,
  name,
  value,
  placeholder,
  Icon,
  disabled,
  readOnly,
  onChange,
}) {
  return (
    <label className="business-profile-field">
      <span>{label}</span>

      <div
        className={`business-profile-input-wrap ${
          disabled ? "is-disabled" : ""
        }`}
      >
        <Icon size={16} />

        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
        />
      </div>
    </label>
  );
}