import { useTranslation } from "react-i18next";
import ConsultationPanel from "../components/ConsultationPanel";
import ConsultationSummariesPanel from "../components/ConsultationSummariesPanel";

export default function ConsultationPage() {
  const { t } = useTranslation("consultation");

  return (
    <div className="consultation-page">
      <div className="consultation-page-main">
        <ConsultationPanel mode="page" />
      </div>

      <aside className="consultation-page-side">
        <ConsultationSummariesPanel />
      </aside>
    </div>
  );
}