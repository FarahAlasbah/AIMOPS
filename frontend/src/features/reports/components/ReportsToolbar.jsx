import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, FormSelect } from "../../../shared/components";
import { PERIOD_OPTIONS } from "../constants";
import { formatDate } from "../utils/reportUtils";

export function ReportsToolbar({ period, dateRange, report, onPeriodChange }) {
  const { t, i18n } = useTranslation("reports");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const periodOptions = useMemo(() => {
    return PERIOD_OPTIONS.map((option) => ({
      value: option.value,
      label: t(option.labelKey),
    }));
  }, [t]);

  return (
    <Card>
      <div className="reports-toolbar">
        <div>
          <div className="reports-toolbar-title">{t("toolbar.title")}</div>
          <p>{t("toolbar.description")}</p>
        </div>

        <div className="reports-filter-group">
          <div className="reports-filter-item">
            <span>{t("toolbar.preset")}</span>
            <FormSelect
              value={period}
              onChange={onPeriodChange}
              options={periodOptions}
            />
          </div>

          <div className="reports-date-pill">
            <CalendarDays size={15} />
            <span>
              {formatDate(report?.date_range?.start_date || dateRange.startDate, locale)}{" "}
              → {formatDate(report?.date_range?.end_date || dateRange.endDate, locale)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}