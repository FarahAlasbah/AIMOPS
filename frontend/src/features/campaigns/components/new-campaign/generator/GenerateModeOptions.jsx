// frontend/src/features/campaigns/components/new-campaign/generator/GenerateModeOptions.jsx
import { getGenerateOptions } from "./generatorModalUtils";

export default function GenerateModeOptions({ t, mode, loading, onModeChange }) {
  const options = getGenerateOptions(t);

  return (
    <div className="generate-campaign-modal__options">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`generate-option-card ${
            mode === option.value ? "active" : ""
          } ${loading ? "is-loading" : ""}`}
          onClick={() => {
            if (!loading) {
              onModeChange(option.value);
            }
          }}
          disabled={loading}
        >
          <span className="generate-option-card__title">
            {option.title}
          </span>

          <span className="generate-option-card__description">
            {option.description}
          </span>
        </button>
      ))}
    </div>
  );
}