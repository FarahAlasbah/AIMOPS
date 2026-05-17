// frontend/src/features/campaigns/components/new-campaign/generator/GenerateModalHeader.jsx
import { Sparkles } from "lucide-react";

export default function GenerateModalHeader({ t }) {
  return (
    <div className="generate-campaign-modal__header">
      <div className="generate-campaign-modal__icon">
        <Sparkles size={22} />
      </div>

      <div>
        <h3 id="generate-campaign-title">
          {t("generator.title")}
        </h3>

        <p>{t("generator.subtitle")}</p>
      </div>
    </div>
  );
}