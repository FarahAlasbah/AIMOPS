import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import arCommon from "./locales/ar/common.json";

const resources = {
  en: { common: enCommon },
  ar: { common: arCommon },
};

i18n
  .use(LanguageDetector) // detects saved language, browser language, etc.
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
