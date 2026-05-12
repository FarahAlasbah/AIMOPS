import {
  Activity,
  Megaphone,
  Package,
  TrendingUp,
  Upload,
} from "lucide-react";

import {
  formatCurrency,
  formatNumber,
} from "../utils/reportUtils";

function ReportsSkeletonCard() {
  return (
    <div className="reports-stat-card reports-skeleton-card">
      <div className="reports-skeleton reports-skeleton-title" />
      <div className="reports-skeleton reports-skeleton-value" />
      <div className="reports-skeleton reports-skeleton-line" />
    </div>
  );
}

export function ReportsSummaryCards({
  loading,
  summary,
  campaignCount,
  activeCampaignCount,
}) {
  const cards = [
    {
      label: "Total revenue",
      value: formatCurrency(summary.total_revenue),
      helper: `${formatNumber(summary.average_daily_revenue)} average daily revenue`,
      icon: TrendingUp,
      tone: "blue",
    },
    {
      label: "Quantity sold",
      value: formatNumber(summary.total_quantity_sold),
      helper: `${formatNumber(summary.sales_record_count)} sales records`,
      icon: Package,
      tone: "indigo",
    },
    {
      label: "Products sold",
      value: formatNumber(summary.products_sold_count),
      helper: "Unique products with sales",
      icon: Package,
      tone: "emerald",
    },
    {
      label: "Campaigns",
      value: formatNumber(campaignCount),
      helper: `${formatNumber(activeCampaignCount)} active campaigns`,
      icon: Megaphone,
      tone: "violet",
    },
    {
      label: "Forecast models",
      value: formatNumber(summary.forecast_models_total),
      helper: `${formatNumber(summary.forecast_models_ready)} ready models`,
      icon: Activity,
      tone: "blue",
    },
    {
      label: "Uploads",
      value: formatNumber(summary.uploads_count),
      helper: `${formatNumber(summary.processed_uploads_count)} processed uploads`,
      icon: Upload,
      tone: "amber",
    },
  ];

  return (
    <div className="reports-stat-grid">
      {loading
        ? Array.from({ length: 6 }).map((_, index) => (
            <ReportsSkeletonCard key={index} />
          ))
        : cards.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={`reports-stat-card tone-${item.tone}`}
              >
                <div className="reports-stat-top">
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>

                  <div className="reports-stat-icon">
                    <Icon size={20} />
                  </div>
                </div>

                <p>{item.helper}</p>
              </div>
            );
          })}
    </div>
  );
}