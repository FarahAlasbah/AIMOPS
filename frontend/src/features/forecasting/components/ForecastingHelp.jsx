import { useTranslation } from "react-i18next";
import PageHelp from "../../../shared/components/PageHelp";

export default function ForecastingHelp() {
  const { t } = useTranslation("forecasting");

  return (
    <div className="forecast-help-row">
      <PageHelp
        title={t("help.page.title")}
        buttonLabel={t("help.page.buttonLabel")}
        items={[
          {
            title: t("help.page.items.readiness.title"),
            description: t("help.page.items.readiness.description"),
          },
          {
            title: t("help.page.items.generate.title"),
            description: t("help.page.items.generate.description"),
          },
          {
            title: t("help.page.items.upload.title"),
            description: t("help.page.items.upload.description"),
          },
          {
            title: t("help.page.items.training.title"),
            description: t("help.page.items.training.description"),
          },
          {
            title: t("help.page.items.ready.title"),
            description: t("help.page.items.ready.description"),
          },
          {
            title: t("help.page.items.retry.title"),
            description: t("help.page.items.retry.description"),
          },
        ]}
        note={t("help.page.note")}
      />
    </div>
  );
}