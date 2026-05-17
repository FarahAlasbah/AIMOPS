import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, InfoMessage, PageHeader } from "../../../shared/components";
import ConfirmDialog from "../components/ConfirmDialog";
import ConfirmedEventsSection from "../components/ConfirmedEventsSection";
import DetectedEventsSection from "../components/DetectedEventsSection";
import DraftEventModal from "../components/DraftEventModal";
import EventForm from "../components/EventForm";
import EventsHeaderActions from "../components/EventsHeaderActions";
import EventsTabs from "../components/EventsTabs";
import { useEventsPageData } from "../hooks/useEventsPageData";
import {
  getEventTitle,
  TAB_CONFIRMED,
  TAB_DETECTED,
} from "../utils/eventsPageUtils";
import "./Events.css";

export default function EventsPage() {
  const { t } = useTranslation("events");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = useEventsPageData({
    searchParams,
    setSearchParams,
  });

  const draftCount = page.drafts.length;

  const deleteConfirmTitle =
    page.deleteConfirmCount === 1
      ? t("eventsPage.deleteConfirmTitleOne")
      : t("eventsPage.deleteConfirmTitleMany");

  const deleteConfirmMessage =
    page.deleteConfirmCount === 1
      ? t("eventsPage.deleteConfirmMessageOne", {
          name: getEventTitle(page.deleteConfirmEvents[0], t),
        })
      : t("eventsPage.deleteConfirmMessageMany", {
          count: page.deleteConfirmCount,
        });

  const deleteConfirmAction =
    page.deleteConfirmCount === 1
      ? t("eventsPage.deleteConfirmActionOne")
      : t("eventsPage.deleteConfirmActionMany", {
          count: page.deleteConfirmCount,
        });

  return (
    <div className="events-page">
      <PageHeader
        actions={
          <EventsHeaderActions
            showCreate={page.showCreate}
            onToggleCreate={() => page.setShowCreate((value) => !value)}
          />
        }
      />

      {(page.notice || page.error) && (
  <div className="events-page-messages">
    {page.notice ? (
      <InfoMessage type="success">{page.notice}</InfoMessage>
    ) : null}

    {page.error ? <InfoMessage type="error">{page.error}</InfoMessage> : null}
  </div>
)}
      {page.showCreate && (
        <Card
          title={t("eventsPage.createCardTitle")}
          subtitle={t("eventsPage.createCardSubtitle")}
          className="events-create-card"
        >
          <EventForm
            saving={page.saving}
            onSavingChange={page.setSaving}
            onSuccess={page.handleManualEventCreated}
            onError={page.handleManualEventError}
          />
        </Card>
      )}

      {!page.showCreate && (
        <>
          <EventsTabs
            activeTab={page.activeTab}
            draftsLoading={page.draftsLoading}
            draftCount={draftCount}
            upcoming={page.upcoming}
            onChangeTab={page.setActiveTab}
            onChangeUpcoming={page.setUpcoming}
          />

          {page.activeTab === TAB_DETECTED && (
            <DetectedEventsSection
              drafts={page.drafts}
              draftsLoading={page.draftsLoading}
              draftCount={draftCount}
              selectedDraftIds={page.selectedDraftIds}
              selectedDraftCount={page.selectedDraftCount}
              dismissingIds={page.dismissingIds}
              dismissing={page.dismissing}
              onClearSelection={page.clearDraftSelection}
              onRequestDismissSelected={page.requestDismissSelectedDrafts}
              onToggleOne={page.toggleOneDraft}
              onToggleAll={page.toggleAllDrafts}
              onReview={page.setActiveDraft}
            />
          )}

          {page.activeTab === TAB_CONFIRMED && (
            <ConfirmedEventsSection
              upcoming={page.upcoming}
              loading={page.loading}
              events={page.events}
              selectedEventIds={page.selectedEventIds}
              selectedEventCount={page.selectedEventCount}
              deletingIds={page.deletingEventIds}
              deleting={page.deleting}
              onClearSelection={page.clearEventSelection}
              onRequestDeleteSelected={() => page.requestDeleteEvents()}
              onToggleOne={page.toggleOneEvent}
              onToggleAll={page.toggleAllEvents}
              onDeleteOne={(event) => page.requestDeleteEvents([event])}
              onOpen={(id) => navigate(`/app/events/${id}`)}
            />
          )}
        </>
      )}

      {page.dismissConfirmCount > 0 && (
        <ConfirmDialog
          title={t("eventsPage.dismissConfirmTitle")}
          message={t("eventsPage.dismissConfirmMessage", {
            count: page.dismissConfirmCount,
          })}
          cancelLabel={t("eventsPage.dismissConfirmCancel")}
          confirmLabel={t("eventsPage.dismissConfirmAction", {
            count: page.dismissConfirmCount,
          })}
          onCancel={page.closeDismissConfirm}
          onConfirm={() => page.dismissSelectedDrafts(page.dismissConfirmDrafts)}
        />
      )}

      {page.deleteConfirmCount > 0 && (
        <ConfirmDialog
          title={deleteConfirmTitle}
          message={deleteConfirmMessage}
          cancelLabel={t("eventsPage.deleteConfirmCancel")}
          confirmLabel={deleteConfirmAction}
          onCancel={page.closeDeleteConfirm}
          onConfirm={() => page.deleteConfirmedEvents(page.deleteConfirmEvents)}
        />
      )}

      {page.activeDraft && (
        <DraftEventModal
          event={page.activeDraft}
          onClose={() => page.setActiveDraft(null)}
          onConfirmed={page.handleDraftConfirmed}
          onDismissed={page.handleDraftDismissed}
        />
      )}
    </div>
  );
}