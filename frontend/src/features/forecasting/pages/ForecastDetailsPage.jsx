import { useNavigate, useParams } from "react-router-dom";

import InfoMessage from "../../../shared/components/InfoMessage";

import ForecastAiExplanationCard from "../components/ForecastAiExplanationCard";
import ForecastAnalyticsCard from "../components/ForecastAnalyticsCard";
import ForecastDetailsHeader from "../components/ForecastDetailsHeader";
import ForecastDetailsKpis from "../components/ForecastDetailsKpis";
import ForecastDetailsPageSkeleton from "../components/ForecastDetailsPageSkeleton";
import ForecastDetailsStateCard from "../components/ForecastDetailsStateCard";
import { useForecastDetailsPage } from "../hooks/useForecastDetailsPage";

import "./ForecastDetailsPage.css";

export default function ForecastDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const page = useForecastDetailsPage(productId);

  return (
    <div className="forecast-details-page">
      <ForecastDetailsHeader
        productDisplayName={page.productDisplayName}
        productCategory={page.productCategory}
        onBack={() => navigate("/app/forecasting")}
      />

      {page.statusErr ? (
        <InfoMessage type="error">{page.statusErr}</InfoMessage>
      ) : null}

      {page.detailsErr ? (
        <InfoMessage type="error">{page.detailsErr}</InfoMessage>
      ) : null}

      {page.info ? (
        <InfoMessage type={page.info.type}>{page.info.text}</InfoMessage>
      ) : null}

      {page.statusLoading ? (
        <ForecastDetailsPageSkeleton />
      ) : page.status?.status !== "ready" ? (
        <ForecastDetailsStateCard
          type="not-ready"
          status={page.status}
          likelyNoData={page.likelyNoData}
          actionBusy={page.actionBusy}
          onUploadData={() => navigate("/app/data-upload")}
          onGenerate={page.handleGenerate}
        />
      ) : page.detailsLoading && !page.forecast ? (
        <ForecastDetailsPageSkeleton />
      ) : !page.forecast ? (
        <ForecastDetailsStateCard
          type="missing-forecast"
          detailsWarn={page.detailsWarn}
          likelyNoData={page.likelyNoData}
          actionBusy={page.actionBusy}
          onUploadData={() => navigate("/app/data-upload")}
          onGenerate={page.handleGenerate}
        />
      ) : (
        <>
          <ForecastDetailsKpis
            selectedSummary={page.selectedSummary}
            locale={page.locale}
          />

          <ForecastAnalyticsCard
            locale={page.locale}
            forecastStart={page.forecastStart}
            forecastEnd={page.forecastEnd}
            safeEndDate={page.safeEndDate}
            windowPreset={page.windowPreset}
            selectedSummary={page.selectedSummary}
            noForecastInRange={page.noForecastInRange}
            weeklyBuckets={page.weeklyBuckets}
            dailySeries={page.dailySeries}
            dailyChartOptions={page.dailyChartOptions}
            weeklyChartSeries={page.weeklyChartSeries}
            weeklyChartOptions={page.weeklyChartOptions}
            onPresetChange={page.handlePresetChange}
          />

          <ForecastAiExplanationCard
            locale={page.locale}
            hasFetchedExplanation={page.hasFetchedExplanation}
            hasExplanation={page.hasExplanation}
            explanationLoading={page.explanationLoading}
            explanationText={page.explanationText}
            explanationDrivers={page.explanationDrivers}
            explanationData={page.explanationData}
            explanationErr={page.explanationErr}
            isExplanationStale={page.isExplanationStale}
            onExplain={page.handleExplainWithAi}
            onReExplain={page.handleReExplainWithAi}
          />
        </>
      )}
    </div>
  );
}