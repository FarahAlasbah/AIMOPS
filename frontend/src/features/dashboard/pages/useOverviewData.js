// frontend/src/features/dashboard/pages/useOverviewData.js
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDateRangeFromPeriod } from "../../reports/utils/reportUtils";
import { getDashboardReport } from "../../../api/reports";
import {
  getCampaignsForDashboard,
  getDashboardSummary,
  getForecastSummaryForDashboard,
  getProductsForCharts,
  getUploadsForCharts,
} from "../../../api/dashboard";
import {
  normalizeCampaignStatus,
  normalizeUploadStatus,
} from "./overviewUtils";

export function useOverviewData() {
  const { t } = useTranslation("dashboard");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);

  const [summary, setSummary] = useState({
    usersCount: null,
    uploadsCount: null,
    productsCount: null,
    recentUploads: [],
  });

  const [uploads, setUploads] = useState([]);
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const [forecastSummary, setForecastSummary] = useState({
    total: 0,
    ready: 0,
    training: 0,
    failed: 0,
    idle: 0,
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const dashboardReportRange = getDateRangeFromPeriod("all");
        const [
          summaryResult,
          uploadsResult,
          productsResult,
          campaignsResult,
          forecastResult,
          reportsResult,
        ] = await Promise.allSettled([
          getDashboardSummary(),
          getUploadsForCharts({ limit: 500 }),
          getProductsForCharts({ limit: 200 }),
          getCampaignsForDashboard(),
          getForecastSummaryForDashboard(),
          getDashboardReport({ range: dashboardReportRange }),
        ]);

        if (!alive) return;

        if (summaryResult.status === "fulfilled") setSummary(summaryResult.value || {});
        else setSummary({});

        if (uploadsResult.status === "fulfilled")
          setUploads(Array.isArray(uploadsResult.value) ? uploadsResult.value : []);
        else setUploads([]);

        if (productsResult.status === "fulfilled")
          setProducts(Array.isArray(productsResult.value) ? productsResult.value : []);
        else setProducts([]);

        if (campaignsResult.status === "fulfilled")
          setCampaigns(Array.isArray(campaignsResult.value) ? campaignsResult.value : []);
        else setCampaigns([]);

        if (forecastResult.status === "fulfilled")
          setForecastSummary(forecastResult.value || { total: 0, ready: 0, training: 0, failed: 0, idle: 0 });
        else setForecastSummary({ total: 0, ready: 0, training: 0, failed: 0, idle: 0 });

        if (reportsResult.status === "fulfilled") setReportData(reportsResult.value || null);
        else setReportData(null);

        const allFailed =
          summaryResult.status === "rejected" &&
          uploadsResult.status === "rejected" &&
          productsResult.status === "rejected" &&
          campaignsResult.status === "rejected" &&
          forecastResult.status === "rejected" &&
          reportsResult.status === "rejected";

        if (allFailed) throw summaryResult.reason;
      } catch (e) {
        if (!alive) return;
        setError(e?.message || t("errorLoadFailed"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, [t]);

  const campaignStats = useMemo(() => {
    const stats = { total: campaigns.length, active: 0, planned: 0, completed: 0, draft: 0, other: 0 };
    campaigns.forEach((c) => { stats[normalizeCampaignStatus(c?.status)] += 1; });
    return stats;
  }, [campaigns]);

  const uploadStatusStats = useMemo(() => {
    const counts = { processed: 0, mapping: 0, pending: 0, failed: 0, unknown: 0 };
    uploads.forEach((item) => { counts[normalizeUploadStatus(item?.status)] += 1; });
    return counts;
  }, [uploads]);

  return {
    loading,
    error,
    reportData,
    summary,
    uploads,
    products,
    campaigns,
    forecastSummary,
    campaignStats,
    uploadStatusStats,
  };
}