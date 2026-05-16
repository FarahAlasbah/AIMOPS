import { useTranslation } from "react-i18next";
import { Button, Card } from "../../../shared/components";

export default function ForecastDetailsHeader({
  productDisplayName,
  productCategory,
  onBack,
}) {
  const { t } = useTranslation("forecasting");

  return (
    <>
      <div className="forecast-details-actions">
        <Button type="button" variant="secondary" onClick={onBack}>
          {t("details.back")}
        </Button>
      </div>

      <Card className="forecast-product-card">
        <div className="forecast-product-label">{t("details.metaProduct")}</div>

        <div className="forecast-product-name">
          <bdi>{productDisplayName}</bdi>
        </div>

        <div className="forecast-product-category">
          {t("details.metaCategory")}: <bdi>{productCategory}</bdi>
        </div>
      </Card>
    </>
  );
}