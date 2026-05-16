import { useTranslation } from "react-i18next";
import { Card } from "../../../shared/components";
import EventsTable from "./EventsTable";
import { EventsListSkeleton } from "./Skeletons";

export default function ConfirmedEventsSection({
  upcoming,
  loading,
  events,
  selectedEventIds,
  selectedEventCount,
  deletingIds,
  deleting,
  onClearSelection,
  onRequestDeleteSelected,
  onToggleOne,
  onToggleAll,
  onDeleteOne,
  onOpen,
}) {
  const { t } = useTranslation("events");

  return (
    <Card
      title={
        upcoming
          ? t("eventsPage.cardTitleUpcomingConfirmed")
          : t("eventsPage.cardTitleConfirmed")
      }
      subtitle={t("eventsPage.confirmedCardSubtitle")}
    >
      {loading ? (
        <EventsListSkeleton />
      ) : events.length === 0 ? (
        <div className="events-empty">
          <div className="events-empty-title">
            {t("eventsPage.emptyConfirmedTitle")}
          </div>

          <div className="events-empty-subtitle">
            {t("eventsPage.emptyConfirmedSubtitle")}
          </div>
        </div>
      ) : (
        <>
          {selectedEventCount > 0 && (
            <div className="confirmed-selection-bar">
              <div className="confirmed-selection-text">
                {t("eventsPage.confirmedSelected", {
                  count: selectedEventCount,
                })}
              </div>

              <div className="confirmed-selection-actions">
                <button
                  type="button"
                  className="confirmed-secondary-btn"
                  onClick={onClearSelection}
                  disabled={deleting}
                >
                  {t("eventsPage.clearSelection")}
                </button>

                <button
                  type="button"
                  className="confirmed-delete-selected-btn"
                  onClick={onRequestDeleteSelected}
                  disabled={deleting}
                >
                  {deleting
                    ? t("eventsPage.deletingSelected")
                    : t("eventsPage.deleteSelected", {
                        count: selectedEventCount,
                      })}
                </button>
              </div>
            </div>
          )}

          <EventsTable
            events={events}
            onOpen={onOpen}
            selectable
            selectedIds={selectedEventIds}
            deletingIds={deletingIds}
            onToggleOne={onToggleOne}
            onToggleAll={onToggleAll}
            onDeleteOne={onDeleteOne}
            selectionDisabled={deleting}
          />
        </>
      )}
    </Card>
  );
}