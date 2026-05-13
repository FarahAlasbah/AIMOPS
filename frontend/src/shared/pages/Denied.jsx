// frontend/src/shared/pages/Denied.jsx
import { useTranslation } from "react-i18next";
import { Card, PageHeader } from "../components";
import InfoMessage from "../components/InfoMessage";

export default function Denied() {
  const { t } = useTranslation("common");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader title={t("denied.title")} subtitle={t("denied.subtitle")} />

      <Card>
        <InfoMessage type="error">{t("denied.message")}</InfoMessage>
      </Card>
    </div>
  );
}