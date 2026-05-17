// frontend/src/features/forecasting/components/ForecastProductsTable.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  fmtDate,
  fmtMoney,
  isLikelyNoDataMessage,
  normalizeStatus,
} from "../utils/forecastingUtils";
import ForecastProductActionCell from "./ForecastProductActionCell";

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

  selectedProductIds = [],
  eligibleProductIds = [],
  allVisibleSelected = false,
  bulkGenerating = false,
  onToggleSelect,
  onToggleSelectAll,
  onGenerateSelected,

  onView,
  onUploadData,
  onGenerate,
}) {
  const { t } = useTranslation("forecasting");

  const selectedSet = useMemo(
    () => new Set(selectedProductIds.map(String)),
    [selectedProductIds],
  );

  const eligibleSet = useMemo(
    () => new Set(eligibleProductIds.map(String)),
    [eligibleProductIds],
  );

  const selectedCount = selectedProductIds.length;
  const hasEligibleProducts = eligibleProductIds.length > 0;

  return (
    <div className="forecast-table-wrap">
      <div className="forecast-bulk-toolbar">
        <div className="forecast-bulk-copy">
          <strong>
            {t("bulk.title", {
              defaultValue: "Generate multiple forecasts",
            })}
          </strong>

          <span>
            {t("bulk.subtitle", {
              defaultValue:
                "Select products that need a first forecast or a refreshed forecast.",
            })}
          </span>
        </div>

        <button
          type="button"
          className="forecast-bulk-generate-btn"
          onClick={onGenerateSelected}
          disabled={!selectedCount || bulkGenerating}
        >
          {bulkGenerating ? (
            <GeneratingLabel>
              {t("actions.generating", {
                defaultValue: "Generating...",
              })}
            </GeneratingLabel>
          ) : (
            t("bulk.generateSelected", {
              count: selectedCount,
              defaultValue: `Generate selected (${selectedCount})`,
            })
          )}
        </button>
      </div>

      <table className="forecast-table">
        <colgroup>
          <col className="forecast-col-select" />
          <col className="forecast-col-product" />
          <col className="forecast-col-category" />
          <col className="forecast-col-data" />
          <col className="forecast-col-revenue" />
          <col className="forecast-col-action" />
        </colgroup>

        <thead>
          <tr>
            <th>
              <label className="forecast-select-all">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={!hasEligibleProducts || bulkGenerating}
                  onChange={onToggleSelectAll}
                />
                <span>
                  {t("bulk.selectAll", {
                    defaultValue: "Select all",
                  })}
                </span>
              </label>
            </th>

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
              <td colSpan={6} className="empty">
                {t("table.empty")}
              </td>
            </tr>
          ) : (
            products.map((product) => {
              const productId = Number(product?.product_id ?? product?.id);
              const row = statusMap?.[productId] || {};
              const status = normalizeStatus(row?.status);
              const totalSales = Number(product?.stats?.total_sales || 0);
              const totalRevenue = Number(product?.stats?.total_revenue || 0);
              const busy = !!rowBusy[productId];
              const locallyPending = !!row?.locally_pending;
              const needsUpload =
                totalSales <= 0 || isLikelyNoDataMessage(row?.error);

              const canSelect = eligibleSet.has(String(productId));
              const isSelected = selectedSet.has(String(productId));

              return (
                <tr key={productId}>
                  <td>
                    <input
                      type="checkbox"
                      className="forecast-row-checkbox"
                      checked={isSelected}
                      disabled={!canSelect || bulkGenerating}
                      onChange={() => onToggleSelect(productId)}
                      aria-label={t("bulk.selectProduct", {
                        defaultValue: "Select product",
                      })}
                    />
                  </td>

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
                    <ForecastProductActionCell
                      product={product}
                      row={row}
                      status={status}
                      busy={busy}
                      locallyPending={locallyPending}
                      needsUpload={needsUpload}
                      onView={onView}
                      onUploadData={onUploadData}
                      onGenerate={onGenerate}
                    />
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