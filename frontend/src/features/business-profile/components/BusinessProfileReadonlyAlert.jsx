import { Lock } from "lucide-react";

export default function BusinessProfileReadonlyAlert({ t }) {
  return (
    <div className="business-profile-readonly-alert">
      <Lock size={16} />

      <div>
        <strong>{t("page.readonlyTitle")}</strong>
        <p>{t("page.readonlyMessage")}</p>
      </div>
    </div>
  );
}