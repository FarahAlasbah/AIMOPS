import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

function formatCreatedAt(value, language) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(language || undefined);
}

export default function BusinessProfileOverviewPanel() {
  const { t, i18n } = useTranslation("businessProfile");
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
            <h3>{t("overview.title")}</h3>
            <p>{t("overview.loading")}</p>
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
              <h3>{t("overview.incompleteTitle")}</h3>
              <p>
                {canEditBusinessProfile
                  ? t("overview.incompleteAdmin")
                  : t("overview.incompleteReadonly")}
              </p>
            </div>
          </div>

          <Link
            to="/app/business-profile"
            className="business-profile-overview-link"
          >
            {canEditBusinessProfile
              ? t("overview.setUpProfile")
              : t("overview.viewProfile")}
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
            <h3>{profile?.business_name || t("overview.title")}</h3>
            <p>
              {canEditBusinessProfile
                ? t("overview.activeAdmin")
                : t("overview.activeReadonly")}
            </p>
          </div>
        </div>

        <Link
          to="/app/business-profile"
          className="business-profile-overview-link"
        >
          {canEditBusinessProfile
            ? t("overview.manageProfile")
            : t("overview.viewProfile")}
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="business-profile-overview-grid">
        <div className="business-profile-overview-item">
          <div className="business-profile-overview-item-icon">
            <BriefcaseBusiness size={16} />
          </div>
          <div>
            <span>{t("overview.industry")}</span>
            <strong>{profile?.industry || "—"}</strong>
          </div>
        </div>

        <div className="business-profile-overview-item">
          <div className="business-profile-overview-item-icon">
            <MapPin size={16} />
          </div>
          <div>
            <span>{t("overview.city")}</span>
            <strong>{profile?.city || "—"}</strong>
          </div>
        </div>

        <div className="business-profile-overview-item">
          <div className="business-profile-overview-item-icon">
            <Building2 size={16} />
          </div>
          <div>
            <span>{t("overview.created")}</span>
            <strong>{formatCreatedAt(profile?.created_at, i18n.language)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}