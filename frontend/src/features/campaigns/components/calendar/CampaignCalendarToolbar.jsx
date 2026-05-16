import { RefreshCw } from "lucide-react";

import { FormCalendar } from "../../../../shared/components";

export default function CampaignCalendarToolbar({
  t,
  startDate,
  endDate,
  refreshing,
  loading,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
}) {
  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-field">
        <FormCalendar
          label={t("fields.startDate")}
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          disabled={refreshing}
        />
      </div>

      <div className="calendar-toolbar-field">
        <FormCalendar
          label={t("fields.endDate")}
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => onEndDateChange(e.target.value)}
          disabled={refreshing}
        />
      </div>

      <div className="calendar-toolbar-action">
        <span className="calendar-toolbar-action-spacer">
          {t("toolbar.refresh")}
        </span>

        <button
          type="button"
          className="calendar-refresh-icon-btn"
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
    </div>
  );
}