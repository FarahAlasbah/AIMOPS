import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import { CHART_COLORS } from "../constants";
import {
  exportProductsExcel,
  formatCurrency,
  formatNumber,
  toNumber,
} from "../utils/reportUtils";

export function TopProductsChart({ loading, topProducts }) {
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

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
        formatter: (value) => formatCurrency(value, locale),
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
          (product) =>
            product.product_name || t("charts.topProducts.unnamedProduct"),
        ),
        labels: {
          formatter: (value) => formatNumber(value, 0, locale),
        },
      },
      tooltip: {
        y: {
          formatter: (value) => formatCurrency(value, locale),
        },
      },
    };
  }, [chartProducts, t, locale]);

  return (
    <Card title={t("charts.topProducts.title")}>
      <div className="reports-card-action-row">
        <p className="reports-muted">
          {t("charts.topProducts.description")}
        </p>

        <button
          type="button"
          className="reports-small-btn"
          onClick={() => exportProductsExcel(topProducts, t)}
          disabled={!topProducts.length}
        >
          <Download size={15} />
          {t("actions.excel")}
        </button>
      </div>

      <div className="reports-chart-box reports-chart-box-large">
        {loading ? (
          <div className="reports-empty">{t("charts.topProducts.loading")}</div>
        ) : chartProducts.length ? (
          <ReactApexChart
            type="bar"
            height={360}
            options={options}
            series={[
              {
                name: t("charts.topProducts.revenue"),
                data: chartProducts.map((product) =>
                  toNumber(product.total_revenue, 0),
                ),
              },
            ]}
          />
        ) : (
          <div className="reports-empty">{t("charts.topProducts.empty")}</div>
        )}
      </div>
    </Card>
  );
}