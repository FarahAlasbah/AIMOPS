export default function BusinessProfileSuggestField({
  label,
  name,
  value,
  placeholder,
  Icon,

  suggestions,
  showSuggestions,
  activeSuggestionIndex,

  disabled,
  readOnly,

  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onPick,
}) {
  const listId = `${name}-suggestions-list`;
  const activeOptionId =
    showSuggestions && activeSuggestionIndex >= 0
      ? `${name}-suggestion-${activeSuggestionIndex}`
      : undefined;

  return (
    <div className="business-profile-field">
      <span>{label}</span>

      <div className="business-profile-suggest-wrap">
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
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showSuggestions}
            aria-activedescendant={activeOptionId}
            disabled={disabled}
            readOnly={readOnly}
          />
        </div>

        {showSuggestions ? (
          <div
            id={listId}
            className="business-profile-suggestions"
            role="listbox"
          >
            {suggestions.map((option, index) => {
              const isActive = index === activeSuggestionIndex;

              return (
                <button
                  key={option.en}
                  id={`${name}-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`business-profile-suggestion ${
                    isActive ? "is-active" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onPick(option)}
                >
                  <Icon size={14} />

                  <span className="business-profile-suggestion-text">
                    <strong>{option.en}</strong>
                    <small>{option.ar}</small>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}