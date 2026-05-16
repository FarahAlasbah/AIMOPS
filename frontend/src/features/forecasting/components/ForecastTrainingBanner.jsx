import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

export default function ForecastTrainingBanner({
  count,
  onGoDashboard,
}) {
  const { t } = useTranslation("forecasting");

  if (!count) return null;

  return (
    <div className="forecast-banner">
      <InfoMessage type="info">
        {t("messages.watchNotice", { count })}
      </InfoMessage>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <Button type="button" variant="secondary">
          {t("actions.stayHere")}
        </Button>

        <Button type="button" onClick={onGoDashboard}>
          {t("actions.goDashboard")}
        </Button>
      </div>
    </div>
  );
}