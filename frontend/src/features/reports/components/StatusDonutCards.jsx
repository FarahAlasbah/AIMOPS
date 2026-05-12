import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

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

function buildDonutOptions({ labels, colors, totalLabel, total }) {
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
              formatter: () => formatNumber(total, 0),
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value) => formatNumber(value, 0),
      },
    },
  };
}

export function StatusDonutCards({ loading, forecastHealth, uploadActivity }) {
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
      labels: ["Ready", "Training", "Failed", "Not started"],
      colors: [
        CHART_COLORS.emerald,
        CHART_COLORS.blue,
        CHART_COLORS.red,
        CHART_COLORS.slate,
      ],
      totalLabel: "Models",
      total: forecastTotal,
    });
  }, [forecastTotal]);

  const uploadOptions = useMemo(() => {
    return buildDonutOptions({
      labels: ["Processed", "Mapping", "Pending", "Failed"],
      colors: [
        CHART_COLORS.emerald,
        CHART_COLORS.indigo,
        CHART_COLORS.amber,
        CHART_COLORS.red,
      ],
      totalLabel: "Uploads",
      total: uploadTotal,
    });
  }, [uploadTotal]);

  return (
    <div className="reports-grid reports-grid-secondary">
      <Card title="Forecast readiness">
        <p className="reports-muted">
          Donut view is better here because statuses are parts of the total.
        </p>

        <div className="reports-chart-box">
          {loading ? (
            <div className="reports-empty">Loading chart...</div>
          ) : forecastTotal > 0 ? (
            <ReactApexChart
              type="donut"
              height={295}
              options={forecastOptions}
              series={forecastSeries}
            />
          ) : (
            <div className="reports-empty">
              No forecast status data available.
            </div>
          )}
        </div>
      </Card>

      <Card title="Upload activity">
        <p className="reports-muted">
          Upload status split across processed, mapping, pending, and failed.
        </p>

        <div className="reports-chart-box">
          {loading ? (
            <div className="reports-empty">Loading chart...</div>
          ) : uploadTotal > 0 ? (
            <ReactApexChart
              type="donut"
              height={295}
              options={uploadOptions}
              series={uploadSeries}
            />
          ) : (
            <div className="reports-empty">No upload activity available.</div>
          )}
        </div>
      </Card>
    </div>
  );
}