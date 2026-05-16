import {
  CircleDollarSign,
  Megaphone,
  Package,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const cards = [
    {
      label: t("summary.totalRevenue"),
      value: formatCurrency(summary.total_revenue, locale),
      helper: t("summary.averageDailyRevenue", {
        value: formatCurrency(summary.average_daily_revenue, locale),
      }),
      icon: CircleDollarSign,
      tone: "blue",
    },
    {
      label: t("summary.quantitySold"),
      value: formatNumber(summary.total_quantity_sold, 1, locale),
      helper: t("summary.salesRecords", {
        value: formatNumber(summary.sales_record_count, 0, locale),
      }),
      icon: Package,
      tone: "indigo",
    },
    {
      label: t("summary.productsSold"),
      value: formatNumber(summary.products_sold_count, 0, locale),
      helper: t("summary.uniqueProducts"),
      icon: Package,
      tone: "emerald",
    },
    {
      label: t("summary.campaigns"),
      value: formatNumber(campaignCount, 0, locale),
      helper: t("summary.activeCampaigns", {
        value: formatNumber(activeCampaignCount, 0, locale),
      }),
      icon: Megaphone,
      tone: "violet",
    },
    {
      label: t("summary.uploads"),
      value: formatNumber(summary.uploads_count, 0, locale),
      helper: t("summary.processedUploads", {
        value: formatNumber(summary.processed_uploads_count, 0, locale),
      }),
      icon: Upload,
      tone: "amber",
    },
  ];

  return (
    <div className="reports-stat-grid">
      {loading
        ? Array.from({ length: 5 }).map((_, index) => (
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
                  <span>{item.label}</span>

                  <div className="reports-stat-icon">
                    <Icon size={20} />
                  </div>
                </div>

                <strong className="reports-stat-value">{item.value}</strong>

                <p>{item.helper}</p>
              </div>
            );
          })}
    </div>
  );
}