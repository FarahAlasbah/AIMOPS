import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import {
  CHART_COLORS,
  FORECAST_STATUS_ORDER,
  UPLOAD_STATUS_ORDER,
} from "../constants";
import {
  formatNumber,
  getForecastCount,
  getUploadCount,
} from "../utils/reportUtils";

function buildDonutOptions({ labels, colors, totalLabel, total, locale }) {
  return {
    chart: {
      type: "donut",
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    colors,
    labels,
    dataLabels: { enabled: false },
    legend: {
      position: "bottom",
    },
    stroke: {
      width: 0,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: totalLabel,
              formatter: () => formatNumber(total, 0, locale),
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value) => formatNumber(value, 0, locale),
      },
    },
  };
}

export function StatusDonutCards({ loading, forecastHealth, uploadActivity }) {
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const forecastSeries = useMemo(() => {
    return FORECAST_STATUS_ORDER.map((status) =>
      getForecastCount(forecastHealth, status),
    );
  }, [forecastHealth]);

  const uploadSeries = useMemo(() => {
    return UPLOAD_STATUS_ORDER.map((status) =>
      getUploadCount(uploadActivity, status),
    );
  }, [uploadActivity]);

  const forecastTotal = forecastSeries.reduce((sum, value) => sum + value, 0);
  const uploadTotal = uploadSeries.reduce((sum, value) => sum + value, 0);

  const forecastOptions = useMemo(() => {
    return buildDonutOptions({
      labels: [
        t("charts.forecastReadiness.labels.ready"),
        t("charts.forecastReadiness.labels.training"),
        t("charts.forecastReadiness.labels.failed"),
        t("charts.forecastReadiness.labels.idle"),
      ],
      colors: [
        CHART_COLORS.emerald,
        CHART_COLORS.blue,
        CHART_COLORS.red,
        CHART_COLORS.slate,
      ],
      totalLabel: t("charts.forecastReadiness.totalLabel"),
      total: forecastTotal,
      locale,
    });
  }, [forecastTotal, t, locale]);

  const uploadOptions = useMemo(() => {
    return buildDonutOptions({
      labels: [
        t("charts.uploadActivity.labels.processed"),
        t("charts.uploadActivity.labels.mapping"),
        t("charts.uploadActivity.labels.pending"),
        t("charts.uploadActivity.labels.failed"),
      ],
      colors: [
        CHART_COLORS.emerald,
        CHART_COLORS.indigo,
        CHART_COLORS.amber,
        CHART_COLORS.red,
      ],
      totalLabel: t("charts.uploadActivity.totalLabel"),
      total: uploadTotal,
      locale,
    });
  }, [uploadTotal, t, locale]);

  return (
    <div className="reports-grid reports-grid-secondary">
      <Card title={t("charts.forecastReadiness.title")}>
        <p className="reports-muted">
          {t("charts.forecastReadiness.description")}
        </p>

        <div className="reports-chart-box">
          {loading ? (
            <div className="reports-empty">
              {t("charts.forecastReadiness.loading")}
            </div>
          ) : forecastTotal > 0 ? (
            <ReactApexChart
              type="donut"
              height={295}
              options={forecastOptions}
              series={forecastSeries}
            />
          ) : (
            <div className="reports-empty">
              {t("charts.forecastReadiness.empty")}
            </div>
          )}
        </div>
      </Card>

      <Card title={t("charts.uploadActivity.title")}>
        <p className="reports-muted">
          {t("charts.uploadActivity.description")}
        </p>

        <div className="reports-chart-box">
          {loading ? (
            <div className="reports-empty">
              {t("charts.uploadActivity.loading")}
            </div>
          ) : uploadTotal > 0 ? (
            <ReactApexChart
              type="donut"
              height={295}
              options={uploadOptions}
              series={uploadSeries}
            />
          ) : (
            <div className="reports-empty">
              {t("charts.uploadActivity.empty")}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}