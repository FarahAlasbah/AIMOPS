import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  MapPin,
  Sparkles,
  LineChart,
} from "lucide-react";
import { Card, PageHeader } from "../../../shared/components";
import { useBusinessProfile } from "../hooks/useBusinessProfile";
import "../styles/businessProfile.css";

const INDUSTRY_OPTIONS = [
  "Retail",
  "E-commerce",
  "Food & Beverage",
  "Services",
  "Hospitality",
  "Healthcare",
  "Education",
  "Technology",
  "Manufacturing",
  "Finance",
];

const EMPTY_FORM = {
  business_name: "",
  industry: "",
  city: "",
};

function normalizeForm(profile) {
  return {
    business_name: profile?.business_name || "",
    industry: profile?.industry || "",
    city: profile?.city || "",
  };
}

function formatCreatedAt(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

export default function BusinessProfilePage() {
  const { profile, loading, saving, error, hasProfile, persistProfile } = useBusinessProfile();

  const [form, setForm] = useState(EMPTY_FORM);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setForm(normalizeForm(profile));
  }, [profile]);

  const isValid = useMemo(() => {
    return (
      form.business_name.trim().length > 0 &&
      form.industry.trim().length > 0 &&
      form.city.trim().length > 0
    );
  }, [form]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (successMessage) {
      setSuccessMessage("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const wasExisting = hasProfile;
    const result = await persistProfile(form);

    if (result.success) {
      setSuccessMessage(
        wasExisting
          ? "Business profile updated successfully."
          : "Business profile created successfully."
      );
    }
  }

  return (
    <div className="business-profile-page">
      <PageHeader
        title="Business Profile"
        subtitle="Manage the core business information used across overview, forecasting, campaigns, and AI consultation."
      />

      <div className="business-profile-grid">
        <Card title="Business information">
          {loading ? (
            <div className="business-profile-loading">Loading business profile...</div>
          ) : (
            <form className="business-profile-form" onSubmit={handleSubmit}>
              <label className="business-profile-field">
                <span>Business Name</span>
                <div className="business-profile-input-wrap">
                  <Building2 size={16} />
                  <input
                    type="text"
                    name="business_name"
                    value={form.business_name}
                    onChange={handleChange}
                    placeholder="e.g. AIMOPS Shop"
                  />
                </div>
              </label>

              <label className="business-profile-field">
                <span>Industry</span>
                <div className="business-profile-input-wrap">
                  <BriefcaseBusiness size={16} />
                  <input
                    type="text"
                    name="industry"
                    value={form.industry}
                    onChange={handleChange}
                    list="business-industry-options"
                    placeholder="e.g. Retail"
                  />
                </div>

                <datalist id="business-industry-options">
                  {INDUSTRY_OPTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>

              <label className="business-profile-field">
                <span>City</span>
                <div className="business-profile-input-wrap">
                  <MapPin size={16} />
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Bethlehem"
                  />
                </div>
              </label>

              {error ? <div className="business-profile-message error">{error}</div> : null}
              {successMessage ? (
                <div className="business-profile-message success">{successMessage}</div>
              ) : null}

              <div className="business-profile-actions">
                <button type="submit" disabled={!isValid || saving}>
                  {saving
                    ? "Saving..."
                    : hasProfile
                      ? "Update Profile"
                      : "Create Profile"}
                </button>
              </div>
            </form>
          )}
        </Card>

        <Card title="Profile impact">
          <div className="business-profile-side">
            <div className="business-profile-note-list">
              <div className="business-profile-note-item">
                <div className="business-profile-note-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <strong>AI consultation context</strong>
                  <p>The assistant can answer with better business-specific context.</p>
                </div>
              </div>

              <div className="business-profile-note-item">
                <div className="business-profile-note-icon">
                  <LineChart size={16} />
                </div>
                <div>
                  <strong>Forecasting relevance</strong>
                  <p>Industry and city can support smarter future forecasting logic.</p>
                </div>
              </div>

              <div className="business-profile-note-item">
                <div className="business-profile-note-icon">
                  <Building2 size={16} />
                </div>
                <div>
                  <strong>Workspace identity</strong>
                  <p>This becomes the main business identity shown in the app.</p>
                </div>
              </div>
            </div>

            <div className="business-profile-meta">
              <h4>Current snapshot</h4>

              <div className="business-profile-meta-grid">
                <div>
                  <span>Name</span>
                  <strong>{profile?.business_name || "Not set"}</strong>
                </div>

                <div>
                  <span>Industry</span>
                  <strong>{profile?.industry || "Not set"}</strong>
                </div>

                <div>
                  <span>City</span>
                  <strong>{profile?.city || "Not set"}</strong>
                </div>
              </div>

              <div className="business-profile-created-at">
                Created at: {formatCreatedAt(profile?.created_at)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}