// frontend/src/features/consultation/components/ConsultationPromptSuggestions.jsx
import { useTranslation } from "react-i18next";
import { useConsultation } from "../hooks/useConsultation";

export default function ConsultationPromptSuggestions() {
  const { t } = useTranslation("consultation");
  const { setDraft } = useConsultation();

  const prompts = [
    t("prompt1", {
      defaultValue: "What product should we promote next month?",
    }),
    t("prompt2", {
      defaultValue: "Suggest a bundle campaign based on current demand.",
    }),
    t("prompt3", {
      defaultValue: "Summarize forecast opportunities and risks.",
    }),
    t("prompt4", {
      defaultValue: "Which active campaigns appear most effective?",
    }),
  ];

  return (
    <div className="consultation-prompt-list">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className="consultation-prompt-chip"
          dir="auto"
          onClick={() => setDraft(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}