import { RefreshCw } from "lucide-react";
import { FormSelect } from "../../../../shared/components";
import FormCalendar from "../../../../shared/components/FormCalendar";

export default function UploadsToolbar({
  t,
  uploadsLoading,
  isDeleting,

  searchQuery,
  onSearchChange,

  dateFrom,
  onDateFromChange,

  dateTo,
  onDateToChange,

  sortBy,
  sortOptions,
  onSortChange,

  hasActiveFilters,
  onClearFilters,

  onRefresh,
}) {
  const refreshLabel = uploadsLoading
    ? t("uploadsPage.refreshing", { defaultValue: "Refreshing..." })
    : t("uploadsPage.refresh", { defaultValue: "Refresh" });

  return (
    <>
      <div className="uploads-header">
        <div style={{ fontWeight: 800, color: "#111827" }}>
          {t("uploadsPage.uploadsHeader")}
        </div>

        <div className="uploads-header-actions">
          <button
            type="button"
            className={`uploads-refresh-btn ${
              uploadsLoading ? "is-loading" : ""
            }`}
            onClick={onRefresh}
            disabled={uploadsLoading || isDeleting}
            title={refreshLabel}
            aria-label={refreshLabel}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="uploads-tools">
        <div className="uploads-field uploads-field-search">
          <label htmlFor="uploads-search" className="uploads-label">
            {t("uploadsPage.searchLabel")}
          </label>

          <input
            id="uploads-search"
            className="uploads-input"
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("uploadsPage.searchPlaceholder")}
            disabled={uploadsLoading}
          />
        </div>

        <div className="uploads-field">
          <FormCalendar
            label={t("uploadsPage.dateFrom")}
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            max={dateTo || undefined}
            disabled={uploadsLoading}
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div className="uploads-field">
          <FormCalendar
            label={t("uploadsPage.dateTo")}
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            min={dateFrom || undefined}
            disabled={uploadsLoading}
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div className="uploads-field">
          <FormSelect
            label={t("uploadsPage.sortBy")}
            value={sortBy}
            onChange={onSortChange}
            options={sortOptions}
            disabled={uploadsLoading || isDeleting}
          />
        </div>

        <div className="uploads-tools-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={onClearFilters}
            disabled={!hasActiveFilters || uploadsLoading}
          >
            {t("uploadsPage.clearFilters")}
          </button>
        </div>
      </div>
    </>
  );
}