// frontend/src/features/products/components/ProductsToolbar.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { FormSelect } from "../../../shared/components";
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

  const categoryOptions = useMemo(
    () =>
      categories.map((item) => ({
        value: item,
        label: item === "all" ? t("toolbar.categoryAll") : item,
      })),
    [categories, t],
  );

  const reviewOptions = useMemo(
    () => [
      {
        value: "all",
        label: t("toolbar.reviewAll"),
      },
      {
        value: "suspicious",
        label: t("toolbar.reviewOnly"),
      },
      {
        value: "normal",
        label: t("toolbar.normalOnly"),
      },
    ],
    [t],
  );

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
          title={t("toolbar.btnRefresh")}
          aria-label={t("toolbar.btnRefresh")}
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
              onChange={(event) => onQChange(event.target.value)}
              placeholder={t("toolbar.searchPlaceholder")}
            />
          </div>

          <div className="field">
            <FormSelect
              label={t("toolbar.categoryLabel")}
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              options={categoryOptions}
              disabled={loading}
            />
          </div>

          <div className="field">
            <FormSelect
              label={t("toolbar.reviewLabel")}
              value={suspicious}
              onChange={(event) => onSuspiciousChange(event.target.value)}
              options={reviewOptions}
              disabled={loading}
            />
          </div>

          <div className="field">
            <FormCalendar
              label={t("toolbar.dateFromLabel")}
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              max={dateTo || undefined}
              placeholder="YYYY-MM-DD"
            />
          </div>

          <div className="field">
            <FormCalendar
              label={t("toolbar.dateToLabel")}
              value={dateTo}
              onChange={(event) => onDateToChange(event.target.value)}
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