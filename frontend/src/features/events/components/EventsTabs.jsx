import { useTranslation } from "react-i18next";
import {
  TAB_CONFIRMED,
  TAB_DETECTED,
} from "../utils/eventsPageUtils";

export default function EventsTabs({
  activeTab,
  draftsLoading,
  draftCount,
  upcoming,
  onChangeTab,
  onChangeUpcoming,
}) {
  const { t } = useTranslation("events");

  return (
    <div className="ev-tabs">
      <button
        type="button"
        className={`ev-tab ${activeTab === TAB_DETECTED ? "ev-tab-active" : ""}`}
        onClick={() => onChangeTab(TAB_DETECTED)}
      >
        {t("eventsPage.tabDetected")}

        {draftsLoading ? (
          <span className="ev-tab-spinner" />
        ) : draftCount > 0 ? (
          <span className="ev-tab-badge">{draftCount}</span>
        ) : null}
      </button>

      <button
        type="button"
        className={`ev-tab ${activeTab === TAB_CONFIRMED ? "ev-tab-active" : ""}`}
        onClick={() => onChangeTab(TAB_CONFIRMED)}
      >
        {upcoming
          ? t("eventsPage.tabUpcomingConfirmed")
          : t("eventsPage.tabConfirmed")}
      </button>

      {activeTab === TAB_CONFIRMED && (
        <div className="ev-tabs-right">
          <div className="events-toggle">
            <button
              type="button"
              className={`seg-btn ${!upcoming ? "active" : ""}`}
              onClick={() => onChangeUpcoming(false)}
            >
              {t("eventsPage.btnAllConfirmed")}
            </button>

            <button
              type="button"
              className={`seg-btn ${upcoming ? "active" : ""}`}
              onClick={() => onChangeUpcoming(true)}
            >
              {t("eventsPage.btnUpcoming")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}