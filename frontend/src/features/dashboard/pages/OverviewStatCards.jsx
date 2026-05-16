// frontend/src/features/dashboard/pages/OverviewStatCards.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, Package, TrendingUp, Upload } from "lucide-react";
import { formatNumber } from "./overviewUtils";

export default function OverviewStatCards({ loading, summary, campaignStats, forecastSummary, locale }) {
  const { t } = useTranslation("dashboard");

  const topStats = useMemo(() => [
    {
      key: "uploads",
      label: t("stats.uploadsCount"),
      value: summary?.uploadsCount,
      icon: Upload,
      tone: "blue",
      helper: t("helpers.uploadsHelper"),
    },
    {
      key: "products",
      label: t("stats.productsCount"),
      value: summary?.productsCount,
      icon: Package,
      tone: "indigo",
      helper: t("helpers.productsHelper"),
    },
    {
      key: "campaigns",
      label: t("stats.campaignsCount"),
      value: campaignStats.total,
      icon: Megaphone,
      tone: "violet",
      helper: t("helpers.campaignsHelper", { active: campaignStats.active }),
    },
    {
      key: "forecasts",
      label: t("stats.forecastsReady"),
      value: forecastSummary.ready,
      icon: TrendingUp,
      tone: "emerald",
      helper: t("helpers.forecastsHelper", { total: forecastSummary.total }),
    },
  ], [summary, campaignStats, forecastSummary, t]);

  return (
    <div className="overview-top-grid">
      {topStats.map((item) => {
        const Icon = item.icon;
        return (
          <div className={`overview-stat-card tone-${item.tone}`} key={item.key}>
            <div className="overview-stat-top">
              <div>
                <div className="overview-stat-label">{item.label}</div>
                <div className="overview-stat-value">
                  {loading ? "—" : formatNumber(item.value, locale)}
                </div>
              </div>
              <div className="overview-stat-icon">
                <Icon size={20} />
              </div>
            </div>
            <div className="overview-stat-helper">{item.helper}</div>
          </div>
        );
      })}
    </div>
  );
}