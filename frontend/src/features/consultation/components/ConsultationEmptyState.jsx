import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConsultationPromptSuggestions from "./ConsultationPromptSuggestions";

export default function ConsultationEmptyState() {
  const { t } = useTranslation("consultation");

  return (
    <div className="consultation-empty-state">
      <div className="consultation-empty-icon">
        <Sparkles size={22} />
      </div>
      <h3 className="consultation-empty-title">{t("emptyTitle")}</h3>
      <p className="consultation-empty-description">
        {t("emptyDescription")}
      </p>
      <ConsultationPromptSuggestions />
    </div>
  );
}
