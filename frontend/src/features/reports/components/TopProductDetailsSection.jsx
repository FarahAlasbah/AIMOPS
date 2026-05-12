import { Card } from "../../../shared/components";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  normalizeStatus,
} from "../utils/reportUtils";

export function TopProductDetailsSection({ loading, topProducts }) {
  return (
    <Card title="Top product details">
      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Revenue</th>
              <th>Quantity sold</th>
              <th>Avg daily qty</th>
              <th>Forecast status</th>
              <th>Next 30d qty</th>
              <th>Next 30d revenue</th>
              <th>Last sale</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="reports-table-empty">
                  Loading products...
                </td>
              </tr>
            ) : topProducts.length ? (
              topProducts.map((product) => {
                const status = normalizeStatus(product.forecast_status || "idle");

                return (
                  <tr key={product.product_id || product.product_name}>
                    <td>
                      <div className="reports-table-title">
                        {product.product_name || "Unnamed product"}
                      </div>
                    </td>
                    <td>{product.category || "-"}</td>
                    <td>{formatCurrency(product.total_revenue)}</td>
                    <td>{formatNumber(product.total_quantity_sold)}</td>
                    <td>{formatNumber(product.average_daily_quantity)}</td>
                    <td>
                      <span className={`reports-status-pill ${status}`}>
                        {product.forecast_status || "not started"}
                      </span>
                    </td>
                    <td>
                      {product.forecast_next_30_days_quantity == null
                        ? "-"
                        : formatNumber(product.forecast_next_30_days_quantity)}
                    </td>
                    <td>
                      {product.forecast_next_30_days_revenue == null
                        ? "-"
                        : formatCurrency(product.forecast_next_30_days_revenue)}
                    </td>
                    <td>{formatDate(product.last_sale_date)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="reports-table-empty">
                  No product data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}