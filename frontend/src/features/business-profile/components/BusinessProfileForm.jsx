import { BriefcaseBusiness, Building2, MapPin } from "lucide-react";

import BusinessProfileInputField from "./BusinessProfileInputField";
import BusinessProfileReadonlyAlert from "./BusinessProfileReadonlyAlert";
import BusinessProfileSuggestField from "./BusinessProfileSuggestField";

export default function BusinessProfileForm({
  t,

  form,
  disabled,
  saving,
  error,
  successMessage,
  hasProfile,
  isValid,
  canEditBusinessProfile,

  industrySuggestions,
  citySuggestions,
  showIndustrySuggestions,
  showCitySuggestions,
  activeSuggestionIndex,

  onChange,
  onSuggestionPick,
  onSuggestionFocus,
  onSuggestionBlur,
  onSuggestionKeyDown,
  onSubmit,
}) {
  return (
    <form className="business-profile-form" onSubmit={onSubmit}>
      {!canEditBusinessProfile ? <BusinessProfileReadonlyAlert t={t} /> : null}

      <BusinessProfileInputField
        label={t("page.businessName")}
        name="business_name"
        value={form.business_name}
        placeholder={t("page.businessNamePlaceholder")}
        Icon={Building2}
        disabled={disabled}
        readOnly={!canEditBusinessProfile}
        onChange={onChange}
      />

      <BusinessProfileSuggestField
        label={t("page.industry")}
        name="industry"
        value={form.industry}
        placeholder={t("page.industryPlaceholder")}
        Icon={BriefcaseBusiness}
        suggestions={industrySuggestions}
        showSuggestions={showIndustrySuggestions}
        activeSuggestionIndex={activeSuggestionIndex}
        disabled={disabled}
        readOnly={!canEditBusinessProfile}
        onChange={onChange}
        onFocus={() => onSuggestionFocus("industry")}
        onBlur={onSuggestionBlur}
        onKeyDown={onSuggestionKeyDown("industry", industrySuggestions)}
        onPick={(option) => onSuggestionPick("industry", option)}
      />

      <BusinessProfileSuggestField
        label={t("page.city")}
        name="city"
        value={form.city}
        placeholder={t("page.cityPlaceholder")}
        Icon={MapPin}
        suggestions={citySuggestions}
        showSuggestions={showCitySuggestions}
        activeSuggestionIndex={activeSuggestionIndex}
        disabled={disabled}
        readOnly={!canEditBusinessProfile}
        onChange={onChange}
        onFocus={() => onSuggestionFocus("city")}
        onBlur={onSuggestionBlur}
        onKeyDown={onSuggestionKeyDown("city", citySuggestions)}
        onPick={(option) => onSuggestionPick("city", option)}
      />

      {error ? (
        <div className="business-profile-message error">{error}</div>
      ) : null}

      {successMessage ? (
        <div className="business-profile-message success">
          {successMessage}
        </div>
      ) : null}

      <div className="business-profile-actions">
        <button
          type="submit"
          disabled={!canEditBusinessProfile || !isValid || saving}
          title={canEditBusinessProfile ? undefined : t("page.adminOnlyTitle")}
        >
          {!canEditBusinessProfile
            ? t("page.adminOnlyButton")
            : saving
              ? t("page.saving")
              : hasProfile
                ? t("page.updateProfile")
                : t("page.createProfile")}
        </button>
      </div>
    </form>
  );
}