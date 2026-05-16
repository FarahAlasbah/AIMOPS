import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components";
import PageHelp from "../../../shared/components/PageHelp";

export default function EventsHeaderActions({ showCreate, onToggleCreate }) {
  const { t } = useTranslation("events");
  const navigate = useNavigate();

  return (
    <div className="events-actions">
      <PageHelp
        title={t("eventsPage.pageHelp.title")}
        buttonLabel={t("eventsPage.pageHelp.buttonLabel")}
        items={[
          {
            title: t("eventsPage.pageHelp.items.startTitle"),
            description: t("eventsPage.pageHelp.items.startDescription"),
          },
          {
            title: t("eventsPage.pageHelp.items.reviewTitle"),
            description: t("eventsPage.pageHelp.items.reviewDescription"),
          },
          {
            title: t("eventsPage.pageHelp.items.dismissTitle"),
            description: t("eventsPage.pageHelp.items.dismissDescription"),
          },
          {
            title: t("eventsPage.pageHelp.items.confirmedTitle"),
            description: t("eventsPage.pageHelp.items.confirmedDescription"),
          },
          {
            title: t("eventsPage.pageHelp.items.manualTitle"),
            description: t("eventsPage.pageHelp.items.manualDescription"),
          },
          {
            title: t("eventsPage.pageHelp.items.deleteTitle"),
            description: t("eventsPage.pageHelp.items.deleteDescription"),
          },
        ]}
        note={t("eventsPage.pageHelp.note")}
      />

      <Button
        type="button"
        variant="secondary"
        onClick={() => navigate("/app/calendar")}
      >
        {t("eventsPage.btnViewCalendar")}
      </Button>

      <Button type="button" onClick={onToggleCreate}>
        {showCreate ? t("eventsPage.btnClose") : t("eventsPage.btnCreateEvent")}
      </Button>
    </div>
  );
}