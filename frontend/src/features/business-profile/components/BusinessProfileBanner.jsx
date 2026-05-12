import { Link } from "react-router-dom";

import { useAuth } from "../../../shared/contexts/AuthContext";
import { isAdminUser } from "../../../shared/permissions/rolePermissions";
import { useBusinessProfile } from "../hooks/useBusinessProfile";

export default function BusinessProfileBanner() {
  const { user } = useAuth();
  const canEditBusinessProfile = isAdminUser(user);

  const { loading, isProfileComplete } = useBusinessProfile();

  if (loading || isProfileComplete || !canEditBusinessProfile) {
    return null;
  }

  return (
    <div className="business-profile-banner">
      <div>
        <h3>Complete your business profile</h3>
        <p>
          Add your business name, industry, and city to improve analytics,
          forecasts, and AI recommendations.
        </p>
      </div>

      <Link
        to="/app/business-profile"
        className="business-profile-banner-link"
      >
        Set up profile
      </Link>
    </div>
  );
}