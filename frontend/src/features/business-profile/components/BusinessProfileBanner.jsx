import { Link } from "react-router-dom";
import { useBusinessProfile } from "../hooks/useBusinessProfile";

export default function BusinessProfileBanner() {
  const { initialized, loading, isProfileComplete } = useBusinessProfile();

  if (!initialized || loading || isProfileComplete) {
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

      <Link to="/settings/business-profile" className="business-profile-banner-link">
        Set up profile
      </Link>
    </div>
  );
}