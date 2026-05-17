// frontend/src/features/forecasting/components/ForecastProductActionCell.jsx
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/components";
import {
  normalizeStatus,
  shouldShowRegenerate,
} from "../utils/forecastingUtils";
import ForecastStatusChip from "./ForecastStatusChip";

function GeneratingLabel({ children }) {
  return (
    <span className="forecast-generating-content">
      <span className="forecast-button-spinner" />
      <span>{children}</span>
    </span>
  );
}

export default function ForecastProductActionCell({
  product,
  row,
  status,
  busy,
  locallyPending,
  needsUpload,
  onView,
  onUploadData,
  onGenerate,
}) {
  const { t } = useTranslation("forecasting");

  const productId = Number(product?.product_id ?? product?.id);
  const safeStatus = normalizeStatus(status);
  const showRegenerate = shouldShowRegenerate(product, row);

  if (busy && showRegenerate) {
    return (
      <div className="forecast-actions">
        <div className="forecast-action-row">
          <ForecastStatusChip status="ready" />

          <Button type="button" disabled>
            <GeneratingLabel>
              {t("actions.regenerating", {
                defaultValue: "Regenerating...",
              })}
            </GeneratingLabel>
          </Button>
        </div>
      </div>
    );
  }

  if (showRegenerate) {
    return (
      <div className="forecast-actions">
        <div className="forecast-action-row">
          <ForecastStatusChip status="ready" />

          <Button type="button" onClick={() => onView(productId)}>
            {t("actions.view")}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => onGenerate(product, true)}
          >
            {t("actions.regenerate", {
              defaultValue: "Regenerate Forecast",
            })}
          </Button>
        </div>

        <div className="forecast-warning-text">
          {t("table.regenerateHint", {
            defaultValue:
              "New data was uploaded. Regenerate this forecast to use the latest records.",
          })}
        </div>
      </div>
    );
  }

  const isWorking = busy || locallyPending || safeStatus === "training";

  if (isWorking) {
    return (
      <div className="forecast-actions">
        <div className="forecast-action-row">
          <ForecastStatusChip status="training" />

          <Button type="button" disabled>
            <GeneratingLabel>
              {busy || locallyPending
                ? t("actions.generating")
                : t("actions.training")}
            </GeneratingLabel>
          </Button>
        </div>
      </div>
    );
  }

  if (safeStatus === "ready") {
    return (
      <div className="forecast-actions">
        <div className="forecast-action-row">
          <ForecastStatusChip status="ready" />

          <Button type="button" onClick={() => onView(productId)}>
            {t("actions.view")}
          </Button>
        </div>
      </div>
    );
  }

  if (needsUpload) {
    return (
      <div className="forecast-actions">
        <div className="forecast-action-row">
          <ForecastStatusChip status={safeStatus} />

          <Button type="button" variant="secondary" onClick={onUploadData}>
            {t("actions.uploadData")}
          </Button>
        </div>

        <div className="forecast-warning-text">{t("table.uploadHint")}</div>
      </div>
    );
  }

  if (safeStatus === "failed") {
    return (
      <div className="forecast-actions">
        <div className="forecast-action-row">
          <ForecastStatusChip status="failed" />

          <Button
            type="button"
            variant="secondary"
            onClick={() => onGenerate(product, true)}
          >
            {t("actions.retry")}
          </Button>
        </div>

        {row?.error ? (
          <div className="forecast-error-text">{row.error}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="forecast-actions">
      <div className="forecast-action-row">
        <ForecastStatusChip status={safeStatus} />

        <Button type="button" onClick={() => onGenerate(product)}>
          {t("actions.generate")}
        </Button>
      </div>
    </div>
  );
}