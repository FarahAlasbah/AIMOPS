import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCampaigns } from "../../../api/campaigns";
import { getDashboardReport } from "../../../api/reports";
import { ACTIVE_CAMPAIGN_STATUSES } from "../constants";
import {
  extractArray,
  getCampaignBudget,
  getCampaignRevenue,
  getCampaignRoi,
  getCampaignStatus,
  getDateRangeFromPeriod,
  normalizeSelectValue,
  toNumber,
} from "../utils/reportUtils";

export function useReportsData() {
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState("90");
  const [dateRange, setDateRange] = useState(() =>
    getDateRangeFromPeriod("90"),
  );

  const reportQuery = useQuery({
    queryKey: ["reports-dashboard", dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      getDashboardReport({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
  });

  const campaignsQuery = useQuery({
    queryKey: ["reports-campaigns-fallback"],
    queryFn: getCampaigns,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
  });

  const handlePeriodChange = (nextValue) => {
    const value = normalizeSelectValue(nextValue);
    setPeriod(value);
    setDateRange(getDateRangeFromPeriod(value));
  };

  const report = reportQuery.data || null;
  const summary = report?.summary || {};

  const salesTrend = Array.isArray(report?.sales_trend)
    ? report.sales_trend
    : [];

  const topProducts = Array.isArray(report?.top_products)
    ? report.top_products
    : [];

  const reportCampaignPerformance = Array.isArray(report?.campaign_performance)
    ? report.campaign_performance
    : [];

  const fallbackCampaigns = extractArray(campaignsQuery.data, [
    "campaigns",
    "campaign_performance",
  ]);

  const campaignPerformance = reportCampaignPerformance.length
    ? reportCampaignPerformance
    : fallbackCampaigns;

  const forecastHealth = report?.forecast_health || {};
  const uploadActivity = report?.upload_activity || {};

  const campaignTotals = useMemo(() => {
    let totalBudget = 0;
    let totalRevenue = 0;
    let totalRoi = 0;
    let roiCount = 0;
    let activeCount = 0;

    campaignPerformance.forEach((campaign) => {
      totalBudget += getCampaignBudget(campaign);
      totalRevenue += getCampaignRevenue(campaign);

      const status = getCampaignStatus(campaign);
      if (ACTIVE_CAMPAIGN_STATUSES.has(status)) activeCount += 1;

      const roi = toNumber(getCampaignRoi(campaign), NaN);
      if (Number.isFinite(roi)) {
        totalRoi += roi;
        roiCount += 1;
      }
    });

    return {
      count: campaignPerformance.length,
      activeCount,
      totalBudget,
      totalRevenue,
      averageRoi: roiCount > 0 ? totalRoi / roiCount : null,
    };
  }, [campaignPerformance]);

  const campaignCount = Math.max(
    toNumber(summary.campaign_count, 0),
    campaignTotals.count,
  );

  const activeCampaignCount = Math.max(
    toNumber(summary.active_campaign_count, 0),
    campaignTotals.activeCount,
  );

  const pageError =
    reportQuery.error?.response?.data?.detail ||
    reportQuery.error?.response?.data?.message ||
    reportQuery.error?.message ||
    "";

  return {
    period,
    dateRange,
    loading: reportQuery.isLoading,
    pageError,
    report,
    summary,
    salesTrend,
    topProducts,
    campaignPerformance,
    forecastHealth,
    uploadActivity,
    campaignTotals,
    campaignCount,
    activeCampaignCount,
    handlePeriodChange,
    refreshReports: () => {
      queryClient.invalidateQueries({ queryKey: ["reports-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports-campaigns-fallback"] });
    },
  };
}