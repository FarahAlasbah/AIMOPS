import { useState } from "react";

import { PageHeader } from "../../../shared/components";
import { CampaignImpactChart } from "../components/CampaignImpactChart";
import { CampaignPerformanceSection } from "../components/CampaignPerformanceSection";
import { ReportsHeaderActions } from "../components/ReportsHeaderActions";
import { ReportsHelpModal } from "../components/ReportsHelpModal";
import { ReportsSummaryCards } from "../components/ReportsSummaryCards";
import { ReportsToolbar } from "../components/ReportsToolbar";
import { RevenueQuantityChart } from "../components/RevenueQuantityChart";
import { StatusDonutCards } from "../components/StatusDonutCards";
import { TopProductDetailsSection } from "../components/TopProductDetailsSection";
import { TopProductsChart } from "../components/TopProductsChart";
import { useReportsData } from "../hooks/useReportsData";

import "./ReportsPage.css";

export default function ReportsPage() {
  const [helpOpen, setHelpOpen] = useState(false);

  const {
    period,
    dateRange,
    loading,
    pageError,
    report,
    summary,
    salesTrend,
    topProducts,
    campaignPerformance,
    uploadActivity,
    campaignTotals,
    campaignCount,
    activeCampaignCount,
    handlePeriodChange,
    refreshReports,
  } = useReportsData();

  return (
    <div className="reports-page">
      <PageHeader
        actions={
          <ReportsHeaderActions
            onHelp={() => setHelpOpen(true)}
            onRefresh={refreshReports}
          />
        }
      />

      <ReportsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {pageError ? (
        <div className="reports-alert reports-alert-error">{pageError}</div>
      ) : null}

      <ReportsToolbar
        period={period}
        dateRange={dateRange}
        report={report}
        onPeriodChange={handlePeriodChange}
      />

      <ReportsSummaryCards
        loading={loading}
        summary={summary}
        campaignCount={campaignCount}
        activeCampaignCount={activeCampaignCount}
      />

      <RevenueQuantityChart loading={loading} salesTrend={salesTrend} />

      <div className="reports-grid reports-grid-main">
        <TopProductsChart loading={loading} topProducts={topProducts} />

        <CampaignImpactChart
          loading={loading}
          campaignPerformance={campaignPerformance}
        />
      </div>

      <StatusDonutCards
        loading={loading}
        uploadActivity={uploadActivity}
      />

      <CampaignPerformanceSection
        loading={loading}
        campaignPerformance={campaignPerformance}
        campaignTotals={campaignTotals}
      />

      <TopProductDetailsSection loading={loading} topProducts={topProducts} />
    </div>
  );
}