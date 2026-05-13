import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BriefcaseBusiness, Building2, Lock, MapPin } from "lucide-react";

import { Card } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { isAdminUser } from "../../../shared/permissions/rolePermissions";
import { useBusinessProfile } from "../hooks/useBusinessProfile";

import "../styles/businessProfile.css";

const INDUSTRY_OPTIONS = [
  {
    en: "Retail",
    ar: "تجارة التجزئة",
    aliases: ["retail", "shop", "store", "محل", "متجر", "تجزئة"],
  },
  {
    en: "E-commerce",
    ar: "تجارة إلكترونية",
    aliases: [
      "ecommerce",
      "online shop",
      "online store",
      "الكتروني",
      "إلكتروني",
    ],
  },
  {
    en: "Food & Beverage",
    ar: "مطاعم ومشروبات",
    aliases: [
      "food",
      "restaurant",
      "cafe",
      "مطعم",
      "كافيه",
      "قهوة",
      "مشروبات",
    ],
  },
  {
    en: "Services",
    ar: "خدمات",
    aliases: ["services", "service", "خدمة"],
  },
  {
    en: "Hospitality",
    ar: "ضيافة وفنادق",
    aliases: ["hotel", "hospitality", "tourism", "فندق", "سياحة", "ضيافة"],
  },
  {
    en: "Healthcare",
    ar: "رعاية صحية",
    aliases: ["health", "clinic", "medical", "عيادة", "صحة", "طبي"],
  },
  {
    en: "Education",
    ar: "تعليم",
    aliases: ["school", "academy", "university", "مدرسة", "جامعة", "تعليمي"],
  },
  {
    en: "Technology",
    ar: "تكنولوجيا",
    aliases: ["tech", "software", "it", "تقنية", "برمجة", "تكنولوجيا"],
  },
  {
    en: "Manufacturing",
    ar: "تصنيع",
    aliases: ["factory", "manufacturing", "production", "مصنع", "إنتاج"],
  },
  {
    en: "Finance",
    ar: "مالية",
    aliases: ["finance", "banking", "accounting", "محاسبة", "بنك", "تمويل"],
  },
  {
    en: "Fashion & Apparel",
    ar: "أزياء وملابس",
    aliases: [
      "fashion",
      "clothes",
      "clothing",
      "hijab",
      "ملابس",
      "أزياء",
      "حجاب",
    ],
  },
  {
    en: "Beauty & Cosmetics",
    ar: "تجميل ومستحضرات",
    aliases: ["beauty", "cosmetics", "makeup", "صالون", "تجميل", "مكياج"],
  },
];

const CITY_OPTIONS = [
  {
    en: "Bethlehem",
    ar: "بيت لحم",
    aliases: ["beit lahem", "bethlehem", "بيت لحم", "لحم"],
  },
  {
    en: "Beit Sahour",
    ar: "بيت ساحور",
    aliases: ["beit sahour", "sahour", "بيت ساحور", "ساحور"],
  },
  {
    en: "Beit Jala",
    ar: "بيت جالا",
    aliases: ["beit jala", "jala", "بيت جالا", "جالا"],
  },
  {
    en: "Doha",
    ar: "الدوحة",
    aliases: ["doha", "الدوحة", "دوحة"],
  },
  {
    en: "Al-Khader",
    ar: "الخضر",
    aliases: ["khader", "al khader", "الخضر"],
  },
  {
    en: "Dheisheh",
    ar: "الدهيشة",
    aliases: ["dheisheh", "deheishe", "الدهيشة", "دهيشة"],
  },
  {
    en: "Aida Camp",
    ar: "مخيم عايدة",
    aliases: ["aida", "aida camp", "عايدة", "مخيم عايدة"],
  },
  {
    en: "Artas",
    ar: "أرطاس",
    aliases: ["artas", "أرطاس", "ارطاس"],
  },
  {
    en: "Husan",
    ar: "حوسان",
    aliases: ["husan", "housan", "حوسان"],
  },
  {
    en: "Battir",
    ar: "بتير",
    aliases: ["battir", "بتير"],
  },
  {
    en: "Nahalin",
    ar: "نحالين",
    aliases: ["nahalin", "نحالين"],
  },
  {
    en: "Wadi Fukin",
    ar: "وادي فوكين",
    aliases: ["wadi fukin", "وادي فوكين", "فوكين"],
  },
  {
    en: "Tuqu",
    ar: "تقوع",
    aliases: ["tuqu", "taqu", "تقوع"],
  },
  {
    en: "Za'atara",
    ar: "زعترة",
    aliases: ["zaatara", "za'atara", "زعترة"],
  },
  {
    en: "Jerusalem",
    ar: "القدس",
    aliases: ["jerusalem", "quds", "al quds", "القدس", "قدس"],
  },
  {
    en: "Ramallah",
    ar: "رام الله",
    aliases: ["ramallah", "رام الله", "رام"],
  },
  {
    en: "Al-Bireh",
    ar: "البيرة",
    aliases: ["bireh", "al bireh", "البيرة"],
  },
  {
    en: "Nablus",
    ar: "نابلس",
    aliases: ["nablus", "نابلس"],
  },
  {
    en: "Hebron",
    ar: "الخليل",
    aliases: ["hebron", "khalil", "الخليل", "خليل"],
  },
  {
    en: "Jenin",
    ar: "جنين",
    aliases: ["jenin", "جنين"],
  },
  {
    en: "Tulkarm",
    ar: "طولكرم",
    aliases: ["tulkarm", "طولكرم"],
  },
  {
    en: "Qalqilya",
    ar: "قلقيلية",
    aliases: ["qalqilya", "qalqilia", "قلقيلية"],
  },
  {
    en: "Jericho",
    ar: "أريحا",
    aliases: ["jericho", "أريحا", "اريحا"],
  },
  {
    en: "Salfit",
    ar: "سلفيت",
    aliases: ["salfit", "سلفيت"],
  },
  {
    en: "Tubas",
    ar: "طوباس",
    aliases: ["tubas", "طوباس"],
  },
  {
    en: "Gaza",
    ar: "غزة",
    aliases: ["gaza", "غزة"],
  },
  {
    en: "Rafah",
    ar: "رفح",
    aliases: ["rafah", "رفح"],
  },
  {
    en: "Khan Yunis",
    ar: "خان يونس",
    aliases: ["khan yunis", "khan younis", "خان يونس"],
  },
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

function hasArabic(value) {
  return /[\u0600-\u06FF]/.test(String(value || ""));
}

function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـ]/g, "");
}

function getSuggestionText(option) {
  return [option.en, option.ar, ...(option.aliases || [])]
    .filter(Boolean)
    .map(normalizeSearch)
    .join(" ");
}

function getMatches(value, options) {
  const query = normalizeSearch(value);

  if (!query) {
    return options.slice(0, 8);
  }

  return options
    .filter((option) => getSuggestionText(option).includes(query))
    .sort((a, b) => {
      const aText = getSuggestionText(a);
      const bText = getSuggestionText(b);

      const aStarts = aText.startsWith(query);
      const bStarts = bText.startsWith(query);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.en.localeCompare(b.en);
    })
    .slice(0, 8);
}

function getPickedValue(option, currentInput) {
  return hasArabic(currentInput) ? option.ar : option.en;
}

export default function BusinessProfilePage() {
  const { t } = useTranslation("businessProfile");
  const { user } = useAuth();
  const canEditBusinessProfile = isAdminUser(user);

  const { profile, loading, saving, error, hasProfile, persistProfile } =
    useBusinessProfile();

  const [form, setForm] = useState(EMPTY_FORM);
  const [successMessage, setSuccessMessage] = useState("");
  const [focusedSuggestField, setFocusedSuggestField] = useState("");

  useEffect(() => {
    setForm(normalizeForm(profile));
  }, [profile]);

  const industrySuggestions = useMemo(
    () => getMatches(form.industry, INDUSTRY_OPTIONS),
    [form.industry],
  );

  const citySuggestions = useMemo(
    () => getMatches(form.city, CITY_OPTIONS),
    [form.city],
  );

  const showIndustrySuggestions =
    canEditBusinessProfile &&
    focusedSuggestField === "industry" &&
    industrySuggestions.length > 0;

  const showCitySuggestions =
    canEditBusinessProfile &&
    focusedSuggestField === "city" &&
    citySuggestions.length > 0;

  const isValid = useMemo(() => {
    return (
      form.business_name.trim().length > 0 &&
      form.industry.trim().length > 0 &&
      form.city.trim().length > 0
    );
  }, [form]);

  function handleChange(event) {
    if (!canEditBusinessProfile) return;

    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (successMessage) {
      setSuccessMessage("");
    }
  }

  function handleSuggestionPick(fieldName, option) {
    if (!canEditBusinessProfile) return;

    setForm((current) => ({
      ...current,
      [fieldName]: getPickedValue(option, current[fieldName]),
    }));

    setFocusedSuggestField("");

    if (successMessage) {
      setSuccessMessage("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canEditBusinessProfile) return;

    const wasExisting = hasProfile;
    const result = await persistProfile(form);

    if (result.success) {
      setSuccessMessage(
        wasExisting
          ? t("page.updatedSuccess")
          : t("page.createdSuccess"),
      );
    }
  }

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
            <form className="business-profile-form" onSubmit={handleSubmit}>
              {!canEditBusinessProfile ? (
                <div className="business-profile-readonly-alert">
                  <Lock size={16} />
                  <div>
                    <strong>{t("page.readonlyTitle")}</strong>
                    <p>{t("page.readonlyMessage")}</p>
                  </div>
                </div>
              ) : null}

              <label className="business-profile-field">
                <span>{t("page.businessName")}</span>

                <div
                  className={`business-profile-input-wrap ${
                    disabled ? "is-disabled" : ""
                  }`}
                >
                  <Building2 size={16} />

                  <input
                    type="text"
                    name="business_name"
                    value={form.business_name}
                    onChange={handleChange}
                    placeholder={t("page.businessNamePlaceholder")}
                    disabled={disabled}
                    readOnly={!canEditBusinessProfile}
                  />
                </div>
              </label>

              <div className="business-profile-field">
                <span>{t("page.industry")}</span>

                <div className="business-profile-suggest-wrap">
                  <div
                    className={`business-profile-input-wrap ${
                      disabled ? "is-disabled" : ""
                    }`}
                  >
                    <BriefcaseBusiness size={16} />

                    <input
                      type="text"
                      name="industry"
                      value={form.industry}
                      onChange={handleChange}
                      onFocus={() => {
                        if (canEditBusinessProfile) {
                          setFocusedSuggestField("industry");
                        }
                      }}
                      onBlur={() => {
                        window.setTimeout(
                          () => setFocusedSuggestField(""),
                          120,
                        );
                      }}
                      placeholder={t("page.industryPlaceholder")}
                      autoComplete="off"
                      aria-expanded={showIndustrySuggestions}
                      disabled={disabled}
                      readOnly={!canEditBusinessProfile}
                    />
                  </div>

                  {showIndustrySuggestions ? (
                    <div className="business-profile-suggestions">
                      {industrySuggestions.map((industry) => (
                        <button
                          key={industry.en}
                          type="button"
                          className="business-profile-suggestion"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() =>
                            handleSuggestionPick("industry", industry)
                          }
                        >
                          <BriefcaseBusiness size={14} />

                          <span className="business-profile-suggestion-text">
                            <strong>{industry.en}</strong>
                            <small>{industry.ar}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="business-profile-field">
                <span>{t("page.city")}</span>

                <div className="business-profile-suggest-wrap">
                  <div
                    className={`business-profile-input-wrap ${
                      disabled ? "is-disabled" : ""
                    }`}
                  >
                    <MapPin size={16} />

                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      onFocus={() => {
                        if (canEditBusinessProfile) {
                          setFocusedSuggestField("city");
                        }
                      }}
                      onBlur={() => {
                        window.setTimeout(
                          () => setFocusedSuggestField(""),
                          120,
                        );
                      }}
                      placeholder={t("page.cityPlaceholder")}
                      autoComplete="off"
                      aria-expanded={showCitySuggestions}
                      disabled={disabled}
                      readOnly={!canEditBusinessProfile}
                    />
                  </div>

                  {showCitySuggestions ? (
                    <div className="business-profile-suggestions">
                      {citySuggestions.map((city) => (
                        <button
                          key={city.en}
                          type="button"
                          className="business-profile-suggestion"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSuggestionPick("city", city)}
                        >
                          <MapPin size={14} />

                          <span className="business-profile-suggestion-text">
                            <strong>{city.en}</strong>
                            <small>{city.ar}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

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
                  title={
                    canEditBusinessProfile
                      ? undefined
                      : t("page.adminOnlyTitle")
                  }
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
          )}
        </Card>
      </div>
    </div>
  );
}