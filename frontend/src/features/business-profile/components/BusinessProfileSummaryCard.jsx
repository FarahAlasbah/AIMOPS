import { useTranslation } from "react-i18next";
import { useBusinessProfile } from "../hooks/useBusinessProfile";

export default function BusinessProfileSummaryCard() {
  const { t } = useTranslation("businessProfile");
  const { profile, loading, isProfileComplete } = useBusinessProfile();

  if (loading || !isProfileComplete) {
    return null;
  }

  return (
    <section className="business-profile-summary-card">
      <div className="business-profile-card-header">
        <h3>{t("summary.title")}</h3>
      </div>

      <div className="business-profile-summary-grid">
        <div>
          <span>{t("summary.name")}</span>
          <strong>{profile.business_name}</strong>
        </div>
        <div>
          <span>{t("summary.industry")}</span>
          <strong>{profile.industry}</strong>
        </div>
        <div>
          <span>{t("summary.city")}</span>
          <strong>{profile.city}</strong>
        </div>
      </div>
    </section>
  );
}