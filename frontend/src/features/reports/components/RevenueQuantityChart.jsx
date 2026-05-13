import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useTranslation } from "react-i18next";

import { Card } from "../../../shared/components";
import { CHART_COLORS } from "../constants";
import {
  formatCurrency,
  formatNumber,
  getIntlLocale,
  toNumber,
} from "../utils/reportUtils";

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getWeekStart(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function getWeekEnd(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(0, 0, 0, 0);

  return end;
}

function formatShortDate(date, locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatMonthLabel(date, locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCompactCurrency(value, locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toNumber(value, 0));
}

function buildTrendPoints(salesTrend, t, locale) {
  const sorted = [...salesTrend]
    .map((item) => {
      const date = parseDate(item.period);

      return {
        date,
        revenue: toNumber(item.total_revenue, 0),
        quantity: toNumber(item.total_quantity_sold, 0),
      };
    })
    .filter((item) => item.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sorted.length > 160) {
    const monthMap = new Map();

    sorted.forEach((item) => {
      const key = monthKey(item.date);

      if (!monthMap.has(key)) {
        const start = new Date(item.date.getFullYear(), item.date.getMonth(), 1);

        monthMap.set(key, {
          key,
          start,
          label: formatMonthLabel(start, locale),
          revenue: 0,
          quantity: 0,
        });
      }

      const group = monthMap.get(key);
      group.revenue += item.revenue;
      group.quantity += item.quantity;
    });

    return {
      mode: t("charts.revenueQuantity.monthlyMode"),
      description: t("charts.revenueQuantity.monthlyDescription"),
      points: Array.from(monthMap.values()).sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      ),
    };
  }

  if (sorted.length > 45) {
    const weekMap = new Map();

    sorted.forEach((item) => {
      const start = getWeekStart(item.date);
      const end = getWeekEnd(start);
      const key = dateKey(start);

      if (!weekMap.has(key)) {
        weekMap.set(key, {
          key,
          start,
          end,
          label: `${formatShortDate(start, locale)} - ${formatShortDate(end, locale)}`,
          revenue: 0,
          quantity: 0,
        });
      }

      const group = weekMap.get(key);
      group.revenue += item.revenue;
      group.quantity += item.quantity;
    });

    return {
      mode: t("charts.revenueQuantity.weeklyMode"),
      description: t("charts.revenueQuantity.weeklyDescription"),
      points: Array.from(weekMap.values()).sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      ),
    };
  }

  return {
    mode: t("charts.revenueQuantity.dailyMode"),
    description: t("charts.revenueQuantity.dailyDescription"),
    points: sorted.map((item) => ({
      key: dateKey(item.date),
      start: item.date,
      label: formatShortDate(item.date, locale),
      revenue: item.revenue,
      quantity: item.quantity,
    })),
  };
}

export function RevenueQuantityChart({ loading, salesTrend }) {
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const trendData = useMemo(() => {
    return buildTrendPoints(salesTrend, t, locale);
  }, [salesTrend, t, locale]);

  const options = useMemo(() => {
    return {
      chart: {
        type: "line",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
        animations: {
          enabled: true,
          speed: 650,
        },
      },
      colors: [CHART_COLORS.blue, CHART_COLORS.emerald],
      stroke: {
        curve: "smooth",
        width: [3, 3],
      },
      fill: {
        type: ["gradient", "solid"],
        gradient: {
          opacityFrom: 0.24,
          opacityTo: 0.04,
          stops: [0, 90, 100],
        },
      },
      markers: {
        size: [0, 4],
        strokeWidth: 2,
        hover: {
          size: 6,
        },
      },
      dataLabels: {
        enabled: false,
      },
      grid: {
        borderColor: "#eef2f7",
        strokeDashArray: 4,
        padding: {
          left: 8,
          right: 16,
        },
      },
      legend: {
        position: "top",
        horizontalAlign: "right",
        markers: {
          radius: 12,
        },
      },
      xaxis: {
        categories: trendData.points.map((item) => item.label),
        tickAmount: Math.min(8, trendData.points.length),
        labels: {
          rotate: 0,
          hideOverlappingLabels: true,
          trim: true,
          style: {
            colors: "#6b7280",
            fontSize: "12px",
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: [
        {
          title: {
            text: t("charts.revenueQuantity.revenue"),
          },
          labels: {
            formatter: (value) => formatCompactCurrency(value, locale),
            style: {
              colors: "#374151",
              fontSize: "12px",
            },
          },
        },
        {
          opposite: true,
          title: {
            text: t("charts.revenueQuantity.quantity"),
          },
          labels: {
            formatter: (value) => formatNumber(value, 0, locale),
            style: {
              colors: "#374151",
              fontSize: "12px",
            },
          },
        },
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: [
          {
            formatter: (value) => formatCurrency(value, locale),
          },
          {
            formatter: (value) =>
              t("charts.revenueQuantity.units", {
                value: formatNumber(value, 0, locale),
              }),
          },
        ],
      },
    };
  }, [trendData, t, locale]);

  return (
    <Card title={t("charts.revenueQuantity.title")}>
      <p className="reports-muted">
        {t("charts.revenueQuantity.summary", {
          mode: trendData.mode,
          description: trendData.description,
        })}
      </p>

      <div className="reports-chart-box reports-chart-box-xl">
        {loading ? (
          <div className="reports-empty">{t("charts.revenueQuantity.loading")}</div>
        ) : trendData.points.length ? (
          <ReactApexChart
            type="line"
            height={390}
            options={options}
            series={[
              {
                name: t("charts.revenueQuantity.revenue"),
                type: "area",
                data: trendData.points.map((item) => item.revenue),
              },
              {
                name: t("charts.revenueQuantity.quantitySold"),
                type: "line",
                data: trendData.points.map((item) => item.quantity),
              },
            ]}
          />
        ) : (
          <div className="reports-empty">
            {t("charts.revenueQuantity.empty")}
          </div>
        )}
      </div>
    </Card>
  );
}