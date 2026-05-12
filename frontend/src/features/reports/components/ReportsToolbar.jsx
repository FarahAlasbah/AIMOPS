import { CalendarDays } from "lucide-react";

import { Card, FormSelect } from "../../../shared/components";
import { PERIOD_OPTIONS } from "../constants";
import { formatDate } from "../utils/reportUtils";

export function ReportsToolbar({ period, dateRange, report, onPeriodChange }) {
  return (
    <Card>
      <div className="reports-toolbar">
        <div>
          <div className="reports-toolbar-title">Report period</div>
          <p>
            Data is loaded from the backend reports dashboard endpoint using the
            selected date range.
          </p>
        </div>

        <div className="reports-filter-group">
          <div className="reports-filter-item">
            <span>Preset</span>
            <FormSelect
              value={period}
              onChange={onPeriodChange}
              options={PERIOD_OPTIONS}
            />
          </div>

          <div className="reports-date-pill">
            <CalendarDays size={15} />
            <span>
              {formatDate(report?.date_range?.start_date || dateRange.startDate)}{" "}
              → {formatDate(report?.date_range?.end_date || dateRange.endDate)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}