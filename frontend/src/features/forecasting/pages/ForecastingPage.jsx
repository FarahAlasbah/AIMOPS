import { Card } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import ForecastControls from "../components/ForecastControls";
import ForecastingHelp from "../components/ForecastingHelp";
import ForecastProductsTable from "../components/ForecastProductsTable";
import ForecastSummaryCards from "../components/ForecastSummaryCards";
import ForecastTrainingBanner from "../components/ForecastTrainingBanner";
import {
  ForecastControlsSkeleton,
  ForecastSummarySkeleton,
  ForecastTableSkeleton,
} from "../components/ForecastingPageSkeletons";
import { useForecastingPage } from "../hooks/useForecastingPage";

import "./ForecastingPage.css";

export default function ForecastingPage() {
  const page = useForecastingPage();

  return (
    <div className="forecasting-page">
      <ForecastingHelp />

      {page.pageSkeleton ? (
        <ForecastSummarySkeleton />
      ) : (
        <ForecastSummaryCards summary={page.summary} locale={page.locale} />
      )}

      {!page.pageSkeleton ? (
        <ForecastTrainingBanner
          count={page.trainingProducts.length}
          onGoDashboard={page.handleGoDashboard}
        />
      ) : null}

      {page.err ? (
        <div className="forecast-banner">
          <InfoMessage type="error">{page.err}</InfoMessage>
        </div>
      ) : null}

      {page.info && !page.pageSkeleton ? (
        <div className="forecast-banner">
          <InfoMessage type={page.info.type}>{page.info.text}</InfoMessage>
        </div>
      ) : null}

      <Card className="forecast-panel">
        {page.loading ? (
          <ForecastControlsSkeleton />
        ) : (
          <ForecastControls
            refreshing={page.refreshing}
            loading={page.loading}
            resultCount={page.filtered.length}
            q={page.q}
            category={page.category}
            statusFilter={page.statusFilter}
            dateFilter={page.dateFilter}
            sortKey={page.sortKey}
            categories={page.categories}
            statusOptions={page.statusOptions}
            sortOptions={page.sortOptions}
            onRefresh={page.handleRefresh}
            onChangeSearch={page.setQ}
            onChangeCategory={page.setCategory}
            onChangeStatus={page.setStatusFilter}
            onChangeDate={page.setDateFilter}
            onChangeSort={page.setSortKey}
          />
        )}

        {page.pageSkeleton ? (
          <ForecastTableSkeleton />
        ) : (
          <ForecastProductsTable
            products={page.filtered}
            statusMap={page.statusMap}
            rowBusy={page.rowBusy}
            locale={page.locale}
            onView={page.handleViewForecast}
            onUploadData={page.handleUploadData}
            onGenerate={page.handleGenerate}
          />
        )}
      </Card>
    </div>
  );
}