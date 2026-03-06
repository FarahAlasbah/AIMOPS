// frontend/src/shared/components/LangToggle.jsx
import { useTranslation } from "react-i18next";
import "./LangToggle.css";

export default function LangToggle() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");

  const toggle = () => i18n.changeLanguage(isAr ? "en" : "ar");

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={toggle}
      aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
    >
      <span className={`lang-opt ${!isAr ? "active" : ""}`}>EN</span>
      <span className="lang-divider" />
      <span className={`lang-opt ${isAr ? "active" : ""}`}>ع</span>
    </button>
  );
}