import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { isAdminUser } from "../../../shared/permissions/rolePermissions";

import BusinessProfileForm from "../components/BusinessProfileForm";
import { useBusinessProfile } from "../hooks/useBusinessProfile";
import { useBusinessProfileForm } from "../hooks/useBusinessProfileForm";

import "../styles/businessProfile.css";

export default function BusinessProfilePage() {
  const { t } = useTranslation("businessProfile");
  const { user } = useAuth();

  const canEditBusinessProfile = isAdminUser(user);

  const { profile, loading, saving, error, hasProfile, persistProfile } =
    useBusinessProfile();

  const {
    form,
    successMessage,

    industrySuggestions,
    citySuggestions,
    showIndustrySuggestions,
    showCitySuggestions,
    activeSuggestionIndex,

    isValid,

    handleChange,
    handleSuggestionPick,
    handleSuggestionFocus,
    handleSuggestionBlur,
    handleSuggestionKeyDown,
    handleSubmit,
  } = useBusinessProfileForm({
    profile,
    hasProfile,
    persistProfile,
    canEditBusinessProfile,
    t,
  });

  const disabled = loading || saving || !canEditBusinessProfile;

  return (
    <div className="business-profile-page">
      <div className="business-profile-grid">
        <Card title={t("page.cardTitle")}>
          {loading ? (
            <div className="business-profile-loading">
              {t("page.loading")}
            </div>
          ) : (
            <BusinessProfileForm
              t={t}
              form={form}
              disabled={disabled}
              saving={saving}
              error={error}
              successMessage={successMessage}
              hasProfile={hasProfile}
              isValid={isValid}
              canEditBusinessProfile={canEditBusinessProfile}
              industrySuggestions={industrySuggestions}
              citySuggestions={citySuggestions}
              showIndustrySuggestions={showIndustrySuggestions}
              showCitySuggestions={showCitySuggestions}
              activeSuggestionIndex={activeSuggestionIndex}
              onChange={handleChange}
              onSuggestionPick={handleSuggestionPick}
              onSuggestionFocus={handleSuggestionFocus}
              onSuggestionBlur={handleSuggestionBlur}
              onSuggestionKeyDown={handleSuggestionKeyDown}
              onSubmit={handleSubmit}
            />
          )}
        </Card>
      </div>
    </div>
  );
}