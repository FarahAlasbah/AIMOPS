import { Card, PageHeader, InfoMessage } from "../../../shared/components";
import { useTranslation } from "react-i18next";

const AccessDenied = () => {
  const { t } = useTranslation("admin");

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <PageHeader title={t("accessDenied.title")} />
      <Card>
        <InfoMessage type="error">{t("accessDenied.usersOnlyAdmins")}</InfoMessage>
      </Card>
    </div>
  );
};

export default AccessDenied;
