// frontend/src/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import arCommon from "./locales/ar/common.json";
import enAdmin from "./locales/en/admin.json";
import arAdmin from "./locales/ar/admin.json";
import enUpload from "./locales/en/upload.json";
import arUpload from "./locales/ar/upload.json";
import enEvents from "./locales/en/events.json";
import arEvents from "./locales/ar/events.json";
import enProducts from "./locales/en/products.json";
import arProducts from "./locales/ar/products.json";
import enAuth from "./locales/en/auth.json";
import arAuth from "./locales/ar/auth.json";
import enDashboard from "./locales/en/dashboard.json";
import arDashboard from "./locales/ar/dashboard.json";
import enForecasting from "./locales/en/forecasting.json";
import arForecasting from "./locales/ar/forecasting.json";
import enCampaigns from "./locales/en/campaigns.json";
import arCampaigns from "./locales/ar/campaigns.json";
import enConsultation from "./locales/en/consultation.json";
import arConsultation from "./locales/ar/consultation.json";
import enBusinessProfile from "./locales/en/businessProfile.json";
import arBusinessProfile from "./locales/ar/businessProfile.json";
import enReports from "./locales/en/reports.json";
import arReports from "./locales/ar/reports.json";

const resources = {
  en: {
    common: enCommon,
    admin: enAdmin,
    upload: enUpload,
    events: enEvents,
    products: enProducts,
    auth: enAuth,
    dashboard: enDashboard,
    forecasting: enForecasting,
    campaigns: enCampaigns,
    consultation: enConsultation,
    businessProfile: enBusinessProfile,
    reports: enReports,
  },
  ar: {
    common: arCommon,
    admin: arAdmin,
    upload: arUpload,
    events: arEvents,
    products: arProducts,
    auth: arAuth,
    dashboard: arDashboard,
    forecasting: arForecasting,
    campaigns: arCampaigns,
    consultation: arConsultation,
    businessProfile: arBusinessProfile,
    reports: arReports,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;