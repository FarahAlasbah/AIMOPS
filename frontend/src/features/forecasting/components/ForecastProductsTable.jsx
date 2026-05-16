import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components";
import {
  fmtDate,
  fmtMoney,
  isLikelyNoDataMessage,
  normalizeStatus,
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

export default function ForecastProductsTable({
  products,
  statusMap,
  rowBusy,
  locale,
  onView,
  onUploadData,
  onGenerate,
}) {
  const { t } = useTranslation("forecasting");

  return (
    <div className="forecast-table-wrap">
      <table className="forecast-table">
        <colgroup>
          <col className="forecast-col-product" />
          <col className="forecast-col-category" />
          <col className="forecast-col-data" />
          <col className="forecast-col-revenue" />
          <col className="forecast-col-action" />
        </colgroup>

        <thead>
          <tr>
            <th>{t("table.colProduct")}</th>
            <th>{t("table.colCategory")}</th>
            <th>{t("table.colDataAvailable")}</th>
            <th>{t("table.colRevenue")}</th>
            <th>{t("table.colAction")}</th>
          </tr>
        </thead>

        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty">
                {t("table.empty")}
              </td>
            </tr>
          ) : (
            products.map((product) => {
              const productId = Number(product?.product_id);
              const row = statusMap?.[productId] || {};
              const status = normalizeStatus(row?.status);
              const totalSales = Number(product?.stats?.total_sales || 0);
              const totalRevenue = Number(product?.stats?.total_revenue || 0);
              const busy = !!rowBusy[productId];
              const locallyPending = !!row?.locally_pending;
              const needsUpload =
                totalSales <= 0 || isLikelyNoDataMessage(row?.error);

              return (
                <tr key={productId}>
                  <td className="forecast-name-cell">
                    <div className="name">
                      <bdi>
                        {product?.product_name ||
                          t("details.productFallback", { id: productId })}
                      </bdi>
                    </div>

                    <div className="sub">
                      <bdi>{product?.normalized_name || "—"}</bdi>
                    </div>
                  </td>

                  <td>
                    <bdi>{product?.category || "—"}</bdi>
                  </td>

                  <td>
                    <div>
                      {totalSales > 0
                        ? t("table.salesRecords", { count: totalSales })
                        : t("table.noData")}
                    </div>

                    <div className="forecast-note">
                      {product?.stats?.last_sale
                        ? t("table.lastSale", {
                            date: fmtDate(product.stats.last_sale, locale),
                          })
                        : "—"}
                    </div>
                  </td>

                  <td>{fmtMoney(totalRevenue, locale)}</td>

                  <td>
                    <div className="forecast-actions">
                      <div className="forecast-action-row">
                        <ForecastStatusChip status={status} />

                        {status === "ready" ? (
                          <Button
                            type="button"
                            onClick={() => onView(productId)}
                          >
                            {t("actions.view")}
                          </Button>
                        ) : status === "training" || busy || locallyPending ? (
                          <Button type="button" disabled>
                            <GeneratingLabel>
                              {busy || locallyPending
                                ? t("actions.generating")
                                : t("actions.training")}
                            </GeneratingLabel>
                          </Button>
                        ) : needsUpload ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={onUploadData}
                          >
                            {t("actions.uploadData")}
                          </Button>
                        ) : status === "failed" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onGenerate(product, true)}
                          >
                            {t("actions.retry")}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => onGenerate(product)}
                          >
                            {t("actions.generate")}
                          </Button>
                        )}
                      </div>

                      {status === "failed" && row?.error ? (
                        <div className="forecast-error-text">{row.error}</div>
                      ) : null}

                      {needsUpload ? (
                        <div className="forecast-warning-text">
                          {t("table.uploadHint")}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}