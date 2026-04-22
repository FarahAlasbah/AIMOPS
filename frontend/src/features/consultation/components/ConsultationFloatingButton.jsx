import { MessageSquareText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useConsultation } from "../hooks/useConsultation";

export default function ConsultationFloatingButton() {
  const { t } = useTranslation("consultation");
  const location = useLocation();
  const { openDrawer } = useConsultation();

  const pathname = location.pathname;

  const isCampaignPage =
    pathname === "/app/campaigns" ||
    pathname === "/app/campaigns/new" ||
    pathname.startsWith("/app/campaigns/");

  if (!isCampaignPage) return null;

  return (
    <button
      type="button"
      className="consultation-floating-button"
      onClick={openDrawer}
      aria-label={t("launchButton", { defaultValue: "Consult with AI" })}
      title={t("launchButton", { defaultValue: "Consult with AI" })}
    >
      <MessageSquareText size={20} />
      <span className="consultation-floating-button-text">
        {t("launchButton", { defaultValue: "Consult with AI" })}
      </span>
    </button>
  );
}