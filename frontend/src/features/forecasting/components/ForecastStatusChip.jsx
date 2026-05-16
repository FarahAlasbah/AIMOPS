import { useTranslation } from "react-i18next";
import { normalizeStatus } from "../utils/forecastingUtils";

export default function ForecastStatusChip({ status }) {
  const { t } = useTranslation("forecasting");
  const safe = normalizeStatus(status);

  return (
    <span className={`forecast-chip ${safe}`}>
      {safe === "ready"
        ? t("table.ready")
        : safe === "training"
          ? t("table.training")
          : safe === "failed"
            ? t("table.failed")
            : t("table.notStarted")}
    </span>
  );
}