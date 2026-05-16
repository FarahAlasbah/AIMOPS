import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addDaysToKey,
  clampDateKey,
  DEFAULT_VISIBLE_DAYS,
  fmtMoney,
  fmtNumber,
  getRangeLength,
  getWeekStartKey,
  isLikelyNoDataMessage,
  normalizeExplanationResponse,
  toLocalDateKey,
  WINDOW_PRESETS,
} from "../utils/forecastDetailsUtils";

export function useForecastDetailsAnalytics({
  productId,
  status,
  forecast,
  detailsErr,
  explanationData,
}) {
  const { t, i18n } = useTranslation("forecasting");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [windowPreset, setWindowPreset] = useState(
    String(DEFAULT_VISIBLE_DAYS),
  );
  const [selectedEndDate, setSelectedEndDate] = useState("");

  useEffect(() => {
    if (!forecast) return;

    const start = forecast?.forecast_period?.start || toLocalDateKey();
    const end =
      forecast?.forecast_period?.end ||
      forecast?.daily?.[forecast?.daily?.length - 1]?.date ||
      start;

    const defaultEnd = clampDateKey(
      addDaysToKey(start, DEFAULT_VISIBLE_DAYS - 1),
      start,
      end,
    );

    const visibleLength = getRangeLength(start, defaultEnd);

    setWindowPreset(
      String(
        WINDOW_PRESETS.includes(visibleLength)
          ? visibleLength
          : DEFAULT_VISIBLE_DAYS,
      ),
    );

    setSelectedEndDate(defaultEnd);
  }, [
    forecast?.product_id,
    forecast?.forecast_period?.start,
    forecast?.forecast_period?.end,
  ]);

  const daily = Array.isArray(forecast?.daily) ? forecast.daily : [];

  const forecastStart = forecast?.forecast_period?.start || toLocalDateKey();
  const forecastEnd =
    forecast?.forecast_period?.end ||
    daily?.[daily.length - 1]?.date ||
    forecastStart;

  const safeEndDate = clampDateKey(
    selectedEndDate || forecastEnd,
    forecastStart,
    forecastEnd,
  );

  const visibleDaily = useMemo(() => {
    return daily.filter((item) => {
      const date = String(item?.date || "");
      return date >= forecastStart && date <= safeEndDate;
    });
  }, [daily, forecastStart, safeEndDate]);

  const hasBounds = useMemo(() => {
    return visibleDaily.some(
      (item) => item?.quantity_lower != null || item?.quantity_upper != null,
    );
  }, [visibleDaily]);

  const selectedSummary = useMemo(() => {
    if (!visibleDaily.length) {
      return {
        totalQuantity: 0,
        avgDailyQuantity: 0,
        totalRevenue: 0,
        peakDate: null,
        peakQuantity: 0,
        confidence: forecast?.summary?.confidence || "—",
        hasEventBoosts: false,
      };
    }

    let totalQuantity = 0;
    let totalRevenue = 0;
    let peakDate = null;
    let peakQuantity = -Infinity;
    const confidenceCounts = {};

    for (const item of visibleDaily) {
      const qty = Number(item?.predicted_quantity || 0);
      const revenue = Number(item?.predicted_revenue || 0);
      const confidence = String(
        item?.confidence || forecast?.summary?.confidence || "medium",
      );

      totalQuantity += qty;
      totalRevenue += revenue;
      confidenceCounts[confidence] = (confidenceCounts[confidence] || 0) + 1;

      if (qty > peakQuantity) {
        peakQuantity = qty;
        peakDate = item?.date || null;
      }
    }

    const confidence =
      Object.entries(confidenceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      forecast?.summary?.confidence ||
      "—";

    return {
      totalQuantity,
      avgDailyQuantity: totalQuantity / visibleDaily.length,
      totalRevenue,
      peakDate,
      peakQuantity: Number.isFinite(peakQuantity) ? peakQuantity : 0,
      confidence,
      hasEventBoosts: visibleDaily.some((item) => !!item?.has_event_boost),
    };
  }, [visibleDaily, forecast?.summary?.confidence]);

  const weeklyBuckets = useMemo(() => {
    const map = new Map();

    for (const item of visibleDaily) {
      const weekStart = getWeekStartKey(item?.date);
      if (!weekStart) continue;

      const current = map.get(weekStart) || {
        weekStart,
        quantity: 0,
        revenue: 0,
        days: 0,
      };

      current.quantity += Number(item?.predicted_quantity || 0);
      current.revenue += Number(item?.predicted_revenue || 0);
      current.days += 1;

      map.set(weekStart, current);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart),
    );
  }, [visibleDaily]);

  const dailySeries = useMemo(() => {
    const series = [];

    if (hasBounds) {
      series.push({
        name: t("details.datasets.confidenceBand"),
        type: "rangeArea",
        data: visibleDaily.map((item) => {
          const predicted = Number(item?.predicted_quantity || 0);
          const lower =
            item?.quantity_lower == null
              ? predicted
              : Number(item.quantity_lower);
          const upper =
            item?.quantity_upper == null
              ? predicted
              : Number(item.quantity_upper);

          return {
            x: new Date(`${item?.date}T00:00:00`).getTime(),
            y: [lower, upper],
          };
        }),
      });
    }

    series.push({
      name: t("details.datasets.quantity"),
      type: "line",
      data: visibleDaily.map((item) => ({
        x: new Date(`${item?.date}T00:00:00`).getTime(),
        y: Number(item?.predicted_quantity || 0),
      })),
    });

    return series;
  }, [hasBounds, visibleDaily, t]);

  const dailyChartOptions = useMemo(() => {
    return {
      chart: {
        type: "line",
        height: 360,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        zoom: { enabled: true },
        foreColor: "#475569",
        fontFamily: "inherit",
      },
      colors: hasBounds ? ["#93c5fd", "#2563eb"] : ["#2563eb"],
      stroke: {
        curve: "smooth",
        width: hasBounds ? [0, 3] : [3],
      },
      fill: {
        opacity: hasBounds ? [0.22, 1] : [0.14],
      },
      dataLabels: { enabled: false },
      markers: {
        size: 0,
        hover: { sizeOffset: 4 },
      },
      legend: {
        position: "top",
        horizontalAlign: "left",
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
      },
      xaxis: {
        type: "datetime",
        labels: { datetimeUTC: false },
        title: {
          text: t("details.axisDailyX"),
        },
      },
      yaxis: {
        forceNiceScale: true,
        title: {
          text: t("details.axisDailyY"),
        },
        labels: {
          formatter: (value) => fmtNumber(value, locale),
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: { format: "dd MMM yyyy" },
        y: {
          formatter: (value, ctx) => {
            const point = visibleDaily?.[ctx?.dataPointIndex];
            const seriesName =
              ctx?.w?.globals?.seriesNames?.[ctx?.seriesIndex] || "";

            if (seriesName === t("details.datasets.confidenceBand")) {
              return `${fmtNumber(point?.quantity_lower, locale)} → ${fmtNumber(
                point?.quantity_upper,
                locale,
              )}`;
            }

            return fmtNumber(value, locale);
          },
        },
      },
      annotations: {
        xaxis: selectedSummary?.peakDate
          ? [
              {
                x: new Date(`${selectedSummary.peakDate}T00:00:00`).getTime(),
                borderColor: "#f59e0b",
                strokeDashArray: 4,
                label: {
                  text: t("details.annotations.peakDay"),
                  style: {
                    background: "#f59e0b",
                    color: "#fff",
                    fontSize: "11px",
                  },
                },
              },
            ]
          : [],
      },
    };
  }, [hasBounds, locale, selectedSummary?.peakDate, t, visibleDaily]);

  const weeklyChartSeries = useMemo(() => {
    return [
      {
        name: t("details.datasets.weeklyQuantity"),
        type: "column",
        data: weeklyBuckets.map((item) => ({
          x: new Date(`${item.weekStart}T00:00:00`).getTime(),
          y: Number(item.quantity.toFixed(2)),
        })),
      },
      {
        name: t("details.datasets.weeklyRevenue"),
        type: "line",
        data: weeklyBuckets.map((item) => ({
          x: new Date(`${item.weekStart}T00:00:00`).getTime(),
          y: Number(item.revenue.toFixed(2)),
        })),
      },
    ];
  }, [weeklyBuckets, t]);

  const weeklyChartOptions = useMemo(() => {
    return {
      chart: {
        type: "line",
        height: 300,
        toolbar: { show: false },
        foreColor: "#475569",
        fontFamily: "inherit",
      },
      colors: ["#1d4ed8", "#0f766e"],
      stroke: {
        width: [0, 3],
        curve: "smooth",
      },
      fill: {
        opacity: [0.9, 1],
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "48%",
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: [0, 4],
        hover: { sizeOffset: 3 },
      },
      legend: {
        position: "top",
        horizontalAlign: "left",
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
      },
      xaxis: {
        type: "datetime",
        labels: { datetimeUTC: false },
        title: {
          text: t("details.axisWeeklyX"),
        },
      },
      yaxis: [
        {
          title: {
            text: t("details.yAxes.quantity"),
          },
          labels: {
            formatter: (value) => fmtNumber(value, locale),
          },
        },
        {
          opposite: true,
          title: {
            text: t("details.yAxes.revenue"),
          },
          labels: {
            formatter: (value) => fmtMoney(value, locale),
          },
        },
      ],
      tooltip: {
        shared: true,
        intersect: false,
        x: { format: "dd MMM yyyy" },
      },
    };
  }, [locale, t, weeklyBuckets]);

  const explanationText = useMemo(() => {
    const normalized = normalizeExplanationResponse(explanationData);
    return String(normalized?.explanation || "").trim();
  }, [explanationData]);

  const hasExplanation = Boolean(explanationText);

  const explanationDrivers = useMemo(() => {
    const normalized = normalizeExplanationResponse(explanationData);

    return Array.isArray(normalized?.key_drivers)
      ? normalized.key_drivers.filter(Boolean)
      : [];
  }, [explanationData]);

  const isExplanationStale = useMemo(() => {
    if (!hasExplanation) return false;

    const explanationTime = new Date(explanationData?.generated_at).getTime();
    const forecastTime = new Date(
      forecast?.model?.trained_at || status?.trained_at || "",
    ).getTime();

    if (Number.isNaN(explanationTime) || Number.isNaN(forecastTime)) {
      return false;
    }

    return forecastTime > explanationTime;
  }, [explanationData, forecast, status, hasExplanation]);

  const handlePresetChange = (e) => {
    const nextValue = String(e.target.value || DEFAULT_VISIBLE_DAYS);
    setWindowPreset(nextValue);

    const days = Number(nextValue) || DEFAULT_VISIBLE_DAYS;
    const nextEnd = clampDateKey(
      addDaysToKey(forecastStart, days - 1),
      forecastStart,
      forecastEnd,
    );

    setSelectedEndDate(nextEnd);
  };

  const statusLikelyNoData = isLikelyNoDataMessage(status?.error);
  const detailsLikelyNoData = isLikelyNoDataMessage(detailsErr);
  const likelyNoData = statusLikelyNoData || detailsLikelyNoData;
  const noForecastInRange = visibleDaily.length === 0;

  const productDisplayName =
    status?.product_name ||
    forecast?.product_name ||
    t("details.productFallback", { id: productId });

  const productCategory = forecast?.category || status?.category || "—";

  return {
    locale,

    windowPreset,
    forecastStart,
    forecastEnd,
    safeEndDate,

    selectedSummary,
    weeklyBuckets,
    dailySeries,
    dailyChartOptions,
    weeklyChartSeries,
    weeklyChartOptions,

    explanationText,
    explanationDrivers,
    hasExplanation,
    isExplanationStale,

    likelyNoData,
    noForecastInRange,
    productDisplayName,
    productCategory,

    handlePresetChange,
  };
}