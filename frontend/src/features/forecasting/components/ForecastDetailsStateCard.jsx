import { useTranslation } from "react-i18next";
import { Button, Card } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

export default function ForecastDetailsStateCard({
  type,
  status,
  likelyNoData,
  detailsWarn,
  actionBusy,
  onUploadData,
  onGenerate,
}) {
  const { t } = useTranslation("forecasting");

  if (type === "not-ready") {
    return (
      <Card>
        <InfoMessage
          type={
            likelyNoData
              ? "warning"
              : status?.status === "failed"
                ? "error"
                : "info"
          }
        >
          {likelyNoData
            ? t("messages.noDataDetected")
            : status?.status === "training"
              ? t("details.trainingMessage")
              : status?.status === "failed"
                ? t("details.failedMessage")
                : t("details.notReadyMessage")}
        </InfoMessage>

        <div className="forecast-state-actions">
          <Button type="button" variant="secondary" onClick={onUploadData}>
            {t("actions.uploadData")}
          </Button>

          {status?.status === "failed" ? (
            <Button
              type="button"
              onClick={() => onGenerate(true)}
              disabled={actionBusy}
            >
              {actionBusy ? t("actions.generating") : t("actions.retry")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => onGenerate(false)}
              disabled={actionBusy}
            >
              {actionBusy ? t("actions.generating") : t("actions.generate")}
            </Button>
          )}
        </div>

        {status?.error ? (
          <div className="forecast-status-error">{status.error}</div>
        ) : null}
      </Card>
    );
  }

  const isMissingForecast = type === "missing-forecast";

  return (
    <Card>
      <InfoMessage type={detailsWarn || likelyNoData ? "warning" : "error"}>
        {detailsWarn ||
          (likelyNoData
            ? t("messages.noDataDetected")
            : t("messages.detailsFailed"))}
      </InfoMessage>

      <div className="forecast-state-actions">
        <Button type="button" variant="secondary" onClick={onUploadData}>
          {t("actions.uploadData")}
        </Button>

        {isMissingForecast && onGenerate ? (
          <Button
            type="button"
            onClick={() => onGenerate(true)}
            disabled={actionBusy}
          >
            {actionBusy
              ? t("actions.generating")
              : t("actions.generate", {
                  defaultValue: "Generate Forecast",
                })}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}