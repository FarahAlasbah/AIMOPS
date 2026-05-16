// frontend/src/features/dashboard/pages/OverviewActivity.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock3 } from "lucide-react";
import { Card } from "../../../shared/components";
import { STATUS_LABEL_KEY } from "./overviewConstants";
import { formatDateTime, normalizeUploadStatus } from "./overviewUtils";

export default function OverviewActivity({ loading, summary, locale }) {
  const { t } = useTranslation("dashboard");

  const recentActivity = useMemo(() => {
    const items = [];

    (summary?.recentUploads || []).forEach((upload) => {
      const fileName =
        upload?.file_name || upload?.filename || upload?.name || t("labels.uploadFile");
      const when = formatDateTime(
        upload?.uploaded_at || upload?.created_at || upload?.date,
        locale,
      );
      items.push({
        title: fileName,
        meta: when,
        badge: t(STATUS_LABEL_KEY[normalizeUploadStatus(upload?.status)]),
      });
    });

    return items.slice(0, 5);
  }, [summary, locale, t]);

  return (
    <Card title={t("charts.recentActivity")}>
      <div className="activity-list">
        {loading ? (
          <div className="chart-empty compact">{t("charts.loading")}</div>
        ) : recentActivity.length ? (
          recentActivity.map((item, index) => (
            <div className="activity-item" key={`${item.title}-${index}`}>
              <div className="activity-item-icon">
                <Clock3 size={18} />
              </div>
              <div className="activity-item-body">
                <div className="activity-item-title">{item.title}</div>
                <div className="activity-item-meta">{item.meta || "—"}</div>
              </div>
              <div className="activity-item-badge">
                <CheckCircle2 size={14} />
                <span>{item.badge}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="chart-empty compact">{t("charts.noRecentUploads")}</div>
        )}
      </div>
    </Card>
  );
}