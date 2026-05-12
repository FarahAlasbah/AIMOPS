import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  MapPin,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../../../shared/contexts/AuthContext";
import { isAdminUser } from "../../../shared/permissions/rolePermissions";
import { useBusinessProfile } from "../hooks/useBusinessProfile";
import "../styles/businessProfile.css";

function formatCreatedAt(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

export default function BusinessProfileOverviewPanel() {
  const { user } = useAuth();
  const canEditBusinessProfile = isAdminUser(user);

  const { profile, loading, isProfileComplete } = useBusinessProfile();

  if (loading) {
    return (
      <section className="business-profile-overview-panel">
        <div className="business-profile-overview-head">
          <div className="business-profile-overview-icon">
            <Building2 size={20} />
          </div>

          <div>
            <h3>Business Profile</h3>
            <p>Loading business profile...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isProfileComplete) {
    return (
      <section className="business-profile-overview-panel is-empty">
        <div className="business-profile-overview-main">
          <div className="business-profile-overview-head">
            <div className="business-profile-overview-icon">
              <Sparkles size={20} />
            </div>

            <div>
              <h3>Business profile is not complete</h3>
              <p>
                {canEditBusinessProfile
                  ? "Add your business name, industry, and city to improve dashboard context, forecasting, and AI consultation quality."
                  : "Only an administrator can complete or update the business profile."}
              </p>
            </div>
          </div>

          <Link
            to="/app/business-profile"
            className="business-profile-overview-link"
          >
            {canEditBusinessProfile ? "Set up profile" : "View profile"}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="business-profile-overview-panel is-complete">
      <div className="business-profile-overview-main">
        <div className="business-profile-overview-head">
          <div className="business-profile-overview-icon">
            <Building2 size={20} />
          </div>

          <div>
            <h3>{profile?.business_name || "Business Profile"}</h3>
            <p>
              {canEditBusinessProfile
                ? "Your workspace business context is active."
                : "Your workspace business context is active. You have read-only access."}
            </p>
          </div>
        </div>

        <Link
          to="/app/business-profile"
          className="business-profile-overview-link"
        >
          {canEditBusinessProfile ? "Manage profile" : "View profile"}
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="business-profile-overview-grid">
        <div className="business-profile-overview-item">
          <div className="business-profile-overview-item-icon">
            <BriefcaseBusiness size={16} />
          </div>
          <div>
            <span>Industry</span>
            <strong>{profile?.industry || "—"}</strong>
          </div>
        </div>

        <div className="business-profile-overview-item">
          <div className="business-profile-overview-item-icon">
            <MapPin size={16} />
          </div>
          <div>
            <span>City</span>
            <strong>{profile?.city || "—"}</strong>
          </div>
        </div>

        <div className="business-profile-overview-item">
          <div className="business-profile-overview-item-icon">
            <Building2 size={16} />
          </div>
          <div>
            <span>Created</span>
            <strong>{formatCreatedAt(profile?.created_at)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}