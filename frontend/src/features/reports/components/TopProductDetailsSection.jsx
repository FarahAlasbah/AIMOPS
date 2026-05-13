import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatStatus,
  normalizeStatus,
} from "../utils/reportUtils";

export function TopProductDetailsSection({ loading, topProducts }) {
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  return (
    <Card title={t("topProductDetails.title")}>
      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>{t("topProductDetails.table.product")}</th>
              <th>{t("topProductDetails.table.category")}</th>
              <th>{t("topProductDetails.table.revenue")}</th>
              <th>{t("topProductDetails.table.quantitySold")}</th>
              <th>{t("topProductDetails.table.avgDailyQty")}</th>
              <th>{t("topProductDetails.table.forecastStatus")}</th>
              <th>{t("topProductDetails.table.next30Qty")}</th>
              <th>{t("topProductDetails.table.next30Revenue")}</th>
              <th>{t("topProductDetails.table.lastSale")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="reports-table-empty">
                  {t("topProductDetails.table.loading")}
                </td>
              </tr>
            ) : topProducts.length ? (
              topProducts.map((product) => {
                const rawStatus =
                  product.forecast_status ||
                  t("topProductDetails.table.notStarted");
                const status = normalizeStatus(product.forecast_status || "idle");

                return (
                  <tr key={product.product_id || product.product_name}>
                    <td>
                      <div className="reports-table-title">
                        {product.product_name ||
                          t("topProductDetails.table.unnamedProduct")}
                      </div>
                    </td>
                    <td>{product.category || "-"}</td>
                    <td>{formatCurrency(product.total_revenue, locale)}</td>
                    <td>{formatNumber(product.total_quantity_sold, 1, locale)}</td>
                    <td>{formatNumber(product.average_daily_quantity, 1, locale)}</td>
                    <td>
                      <span className={`reports-status-pill ${status}`}>
                        {product.forecast_status
                          ? formatStatus(product.forecast_status, t)
                          : rawStatus}
                      </span>
                    </td>
                    <td>
                      {product.forecast_next_30_days_quantity == null
                        ? "-"
                        : formatNumber(
                            product.forecast_next_30_days_quantity,
                            1,
                            locale,
                          )}
                    </td>
                    <td>
                      {product.forecast_next_30_days_revenue == null
                        ? "-"
                        : formatCurrency(
                            product.forecast_next_30_days_revenue,
                            locale,
                          )}
                    </td>
                    <td>{formatDate(product.last_sale_date, locale)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="reports-table-empty">
                  {t("topProductDetails.table.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}