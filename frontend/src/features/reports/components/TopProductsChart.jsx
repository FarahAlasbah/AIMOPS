import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Download } from "lucide-react";

import { Card } from "../../../shared/components";
import { CHART_COLORS } from "../constants";
import {
  exportProductsExcel,
  formatCurrency,
  formatNumber,
  toNumber,
} from "../utils/reportUtils";

export function TopProductsChart({ loading, topProducts }) {
  const chartProducts = useMemo(() => {
    return [...topProducts]
      .sort((a, b) => toNumber(b.total_revenue) - toNumber(a.total_revenue))
      .slice(0, 8);
  }, [topProducts]);

  const options = useMemo(() => {
    return {
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: [CHART_COLORS.navy],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 8,
          barHeight: "56%",
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (value) => formatCurrency(value),
        style: {
          fontSize: "11px",
          fontWeight: 800,
        },
      },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: chartProducts.map(
          (product) => product.product_name || "Unnamed product",
        ),
        labels: {
          formatter: (value) => formatNumber(value, 0),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatCurrency(value),
        },
      },
    };
  }, [chartProducts]);

  return (
    <Card title="Top products by revenue">
      <div className="reports-card-action-row">
        <p className="reports-muted">
          Horizontal bars are easiest to read for product names.
        </p>

        <button
          type="button"
          className="reports-small-btn"
          onClick={() => exportProductsExcel(topProducts)}
          disabled={!topProducts.length}
        >
          <Download size={15} />
          Excel
        </button>
      </div>

      <div className="reports-chart-box reports-chart-box-large">
        {loading ? (
          <div className="reports-empty">Loading chart...</div>
        ) : chartProducts.length ? (
          <ReactApexChart
            type="bar"
            height={360}
            options={options}
            series={[
              {
                name: "Revenue",
                data: chartProducts.map((product) =>
                  toNumber(product.total_revenue, 0),
                ),
              },
            ]}
          />
        ) : (
          <div className="reports-empty">No product data available.</div>
        )}
      </div>
    </Card>
  );
}