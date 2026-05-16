import { useTranslation } from "react-i18next";
import { Card } from "../../../shared/components";
import DraftsSkeleton from "./DraftsSkeleton";
import DraftsTable from "./DraftsTable";

export default function DetectedEventsSection({
  drafts,
  draftsLoading,
  draftCount,
  selectedDraftIds,
  selectedDraftCount,
  dismissingIds,
  dismissing,
  onClearSelection,
  onRequestDismissSelected,
  onToggleOne,
  onToggleAll,
  onReview,
}) {
  const { t } = useTranslation("events");

  return (
    <Card
      title={
        draftsLoading
          ? t("eventsPage.detectedCardTitle")
          : draftCount > 0
            ? t("eventsPage.detectedCardTitleCount", {
                count: draftCount,
              })
            : t("eventsPage.detectedCardTitleEmpty")
      }
      subtitle={t("eventsPage.detectedCardSub")}
    >
      {draftsLoading ? (
        <DraftsSkeleton />
      ) : draftCount === 0 ? (
        <div className="events-empty">
          <div className="events-empty-title">
            {t("eventsPage.detectedEmptyTitle")}
          </div>

          <div className="events-empty-subtitle">
            {t("eventsPage.detectedEmptySubtitle")}
          </div>
        </div>
      ) : (
        <>
          {selectedDraftCount > 0 && (
            <div className="drafts-selection-bar">
              <div className="drafts-selection-text">
                {t("eventsPage.detectedSelected", {
                  count: selectedDraftCount,
                })}
              </div>

              <div className="drafts-selection-actions">
                <button
                  type="button"
                  className="drafts-secondary-btn"
                  onClick={onClearSelection}
                  disabled={dismissing}
                >
                  {t("eventsPage.clearSelection")}
                </button>

                <button
                  type="button"
                  className="drafts-dismiss-selected-btn"
                  onClick={onRequestDismissSelected}
                  disabled={dismissing}
                >
                  {dismissing
                    ? t("eventsPage.dismissingSelected")
                    : t("eventsPage.dismissSelected", {
                        count: selectedDraftCount,
                      })}
                </button>
              </div>
            </div>
          )}

          <DraftsTable
            drafts={drafts}
            selectedIds={selectedDraftIds}
            dismissingIds={dismissingIds}
            onToggleOne={onToggleOne}
            onToggleAll={onToggleAll}
            onReview={onReview}
          />
        </>
      )}
    </Card>
  );
}