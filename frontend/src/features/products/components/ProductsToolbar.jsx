// frontend/src/features/products/components/ProductsToolbar.jsx
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import FormCalendar from "../../../shared/components/FormCalendar";

export default function ProductsToolbar({
  loading,
  resultsCount,
  selectedCount,
  q,
  onQChange,
  category,
  categories,
  onCategoryChange,
  suspicious,
  onSuspiciousChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onRefresh,
  onMergeSelected,
  onDeleteSelected,
  canMerge,
  canDelete,
}) {
  const { t } = useTranslation("products");

  const statusText = loading
    ? t("toolbar.loading")
    : t("toolbar.results", { count: resultsCount });

  const selectionText = selectedCount
    ? ` • ${t("toolbar.selected", { count: selectedCount })}`
    : "";

  return (
    <div className="products-toolbar">
      <div className="products-toolbar-top">
        <div className="muted products-results-text">
          {statusText}
          {selectionText}
        </div>

        <button
          type="button"
          className="products-refresh-icon-btn"
          onClick={onRefresh}
          disabled={loading}
          title={t("toolbar.btnRefresh", { defaultValue: "Refresh" })}
          aria-label={t("toolbar.btnRefresh", { defaultValue: "Refresh" })}
        >
          <RefreshCw size={18} className={loading ? "spin-icon" : ""} />
        </button>
      </div>

      <div className="products-toolbar-main">
        <div className="products-toolbar-left">
          <div className="field field-search">
            <label>{t("toolbar.searchLabel")}</label>
            <input
              className="text"
              value={q}
              onChange={(e) => onQChange(e.target.value)}
              placeholder={t("toolbar.searchPlaceholder")}
            />
          </div>

          <div className="field">
            <label>{t("toolbar.categoryLabel")}</label>
            <select
              className="text"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? t("toolbar.categoryAll") : c}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>
              {t("toolbar.reviewLabel", { defaultValue: "Needs review" })}
            </label>
            <select
              className="text"
              value={suspicious}
              onChange={(e) => onSuspiciousChange(e.target.value)}
            >
              <option value="all">
                {t("toolbar.reviewAll", { defaultValue: "All" })}
              </option>
              <option value="suspicious">
                {t("toolbar.reviewOnly", { defaultValue: "Needs review only" })}
              </option>
              <option value="normal">
                {t("toolbar.normalOnly", { defaultValue: "Normal only" })}
              </option>
            </select>
          </div>

          <div className="field">
            <FormCalendar
              label={t("toolbar.dateFromLabel", { defaultValue: "From date" })}
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              max={dateTo || undefined}
              placeholder="YYYY-MM-DD"
            />
          </div>

          <div className="field">
            <FormCalendar
              label={t("toolbar.dateToLabel", { defaultValue: "To date" })}
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              min={dateFrom || undefined}
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>

        <div className="products-toolbar-right">
  <button
    type="button"
    className="products-action-btn merge"
    onClick={onMergeSelected}
    disabled={loading || !canMerge}
  >
    {t("toolbar.btnMergeSelected")}
  </button>

  <button
    type="button"
    className="products-action-btn delete"
    onClick={onDeleteSelected}
    disabled={loading || !canDelete}
  >
    {t("toolbar.btnDeleteSelected")}
  </button>
</div>
      </div>
    </div>
  );
}