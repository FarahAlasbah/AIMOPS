import { useBusinessProfile } from "../hooks/useBusinessProfile";

export default function BusinessProfileSummaryCard() {
  const { profile, loading, isProfileComplete } = useBusinessProfile();

  if (loading || !isProfileComplete) {
    return null;
  }

  return (
    <section className="business-profile-summary-card">
      <div className="business-profile-card-header">
        <h3>Business Profile</h3>
      </div>

      <div className="business-profile-summary-grid">
        <div>
          <span>Name</span>
          <strong>{profile.business_name}</strong>
        </div>
        <div>
          <span>Industry</span>
          <strong>{profile.industry}</strong>
        </div>
        <div>
          <span>City</span>
          <strong>{profile.city}</strong>
        </div>
      </div>
    </section>
  );
}