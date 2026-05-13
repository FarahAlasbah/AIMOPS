import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../../shared/contexts/AuthContext";
import { isAdminUser } from "../../../shared/permissions/rolePermissions";
import { useBusinessProfile } from "../hooks/useBusinessProfile";

export default function BusinessProfileBanner() {
  const { t } = useTranslation("businessProfile");
  const { user } = useAuth();
  const canEditBusinessProfile = isAdminUser(user);

  const { loading, isProfileComplete } = useBusinessProfile();

  if (loading || isProfileComplete || !canEditBusinessProfile) {
    return null;
  }

  return (
    <div className="business-profile-banner">
      <div>
        <h3>{t("banner.title")}</h3>
        <p>{t("banner.description")}</p>
      </div>

      <Link
        to="/app/business-profile"
        className="business-profile-banner-link"
      >
        {t("banner.action")}
      </Link>
    </div>
  );
}