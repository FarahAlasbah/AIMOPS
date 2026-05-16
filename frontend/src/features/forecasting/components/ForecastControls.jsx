import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FormSelect } from "../../../shared/components";
import FormCalendar from "../../../shared/components/FormCalendar";

export default function ForecastControls({
  refreshing,
  loading,
  resultCount,
  q,
  category,
  statusFilter,
  dateFilter,
  sortKey,
  categories,
  statusOptions,
  sortOptions,
  onRefresh,
  onChangeSearch,
  onChangeCategory,
  onChangeStatus,
  onChangeDate,
  onChangeSort,
}) {
  const { t } = useTranslation("forecasting");

  return (
    <div className="forecast-controls">
      <div className="forecast-controls-top">
        <div className="forecast-results-pill">
          {refreshing
            ? t("toolbar.refreshing")
            : t("toolbar.results", { count: resultCount })}
        </div>

        <button
          type="button"
          className="forecast-refresh-icon-btn"
          onClick={onRefresh}
          disabled={loading || refreshing}
          title={t("toolbar.refresh")}
          aria-label={t("toolbar.refresh")}
        >
          <RefreshCw
            size={18}
            className={loading || refreshing ? "spin-icon" : ""}
          />
        </button>
      </div>

      <div className="forecast-search-block">
        <label>{t("toolbar.searchLabel")}</label>

        <input
          className="forecast-text forecast-text-search"
          value={q}
          onChange={(e) => onChangeSearch(e.target.value)}
          placeholder={t("toolbar.searchPlaceholder")}
          disabled={refreshing}
        />
      </div>

      <div className="forecast-filters-block">
        <div className="forecast-field">
          <FormSelect
            label={t("toolbar.categoryLabel")}
            value={category}
            onChange={(e) => onChangeCategory(e.target.value || "all")}
            options={categories}
            disabled={refreshing}
          />
        </div>

        <div className="forecast-field">
          <FormSelect
            label={t("toolbar.statusLabel")}
            value={statusFilter}
            onChange={(e) => onChangeStatus(e.target.value || "all")}
            options={statusOptions}
            disabled={refreshing}
          />
        </div>

        <div className="forecast-field">
          <FormCalendar
            label={t("toolbar.dateLabel")}
            value={dateFilter}
            onChange={(e) => onChangeDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            disabled={refreshing}
          />
        </div>

        <div className="forecast-field">
          <FormSelect
            label={t("toolbar.sortLabel")}
            value={sortKey}
            onChange={(e) => onChangeSort(e.target.value || "nameAsc")}
            options={sortOptions}
            disabled={refreshing}
          />
        </div>
      </div>
    </div>
  );
}