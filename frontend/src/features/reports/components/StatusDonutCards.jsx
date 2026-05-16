import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import {
  CHART_COLORS,
  UPLOAD_STATUS_ORDER,
} from "../constants";
import {
  formatNumber,
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

export function StatusDonutCards({ loading, uploadActivity }) {
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const uploadSeries = useMemo(() => {
    return UPLOAD_STATUS_ORDER.map((status) =>
      getUploadCount(uploadActivity, status),
    );
  }, [uploadActivity]);

  const uploadTotal = uploadSeries.reduce((sum, value) => sum + value, 0);

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
    <Card title={t("charts.uploadActivity.title")}>

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
  );
}