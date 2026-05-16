// frontend/src/features/dashboard/pages/Overview.jsx
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { PageHeader } from "../../../shared/components";
import BusinessProfileOverviewPanel from "../../business-profile/components/BusinessProfileOverviewPanel";

import { pickDashboard } from "./overviewUtils";
import { useOverviewData } from "./useOverviewData";
import { useOverviewCharts } from "./useOverviewCharts";
import OverviewStatCards from "./OverviewStatCards";
import OverviewCharts from "./OverviewCharts";
import OverviewActivity from "./OverviewActivity";

import "./Overview.css";

export default function Overview() {
  const { t, i18n } = useTranslation("dashboard");
  const { user, hasPermission } = useAuth();

  const dashboardKey = pickDashboard({ user, hasPermission });
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const {
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
  } = useOverviewData();

  const charts = useOverviewCharts({
    locale,
    uploads,
    uploadStatusStats,
    products,
    campaigns,
    forecastSummary,
    campaignStats,
    reportData,
  });

  return (
    <div className="overview-page">
      <PageHeader title={t(`roles.${dashboardKey}.title`)} />

      {error ? <div className="overview-error">{error}</div> : null}

      <BusinessProfileOverviewPanel />

      <OverviewStatCards
        loading={loading}
        summary={summary}
        campaignStats={campaignStats}
        forecastSummary={forecastSummary}
        locale={locale}
      />

      <OverviewCharts
        loading={loading}
        uploads={uploads}
        forecastSummary={forecastSummary}
        campaignStats={campaignStats}
        {...charts}
      />

      <OverviewActivity
        loading={loading}
        summary={summary}
        locale={locale}
      />
    </div>
  );
}