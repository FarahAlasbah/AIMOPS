import PageHelp from "../../../../shared/components/PageHelp";

export default function CampaignListActions({ t, canCreate, onCalendar, onNew }) {
  return (
    <div className="campaign-list-header-actions" style={{ marginBottom: 0 }}>
      <PageHelp
        title={t("help.list.title")}
        buttonLabel={t("help.list.buttonLabel")}
        items={[
          {
            title: t("help.list.items.status.title"),
            description: t("help.list.items.status.description"),
          },
          {
            title: t("help.list.items.filters.title"),
            description: t("help.list.items.filters.description"),
          },
          {
            title: t("help.list.items.details.title"),
            description: t("help.list.items.details.description"),
          },
          {
            title: t("help.list.items.publish.title"),
            description: t("help.list.items.publish.description"),
          },
          {
            title: t("help.list.items.delete.title"),
            description: t("help.list.items.delete.description"),
          },
        ]}
        note={t("help.list.note")}
      />

      <button type="button" className="btn-outline" onClick={onCalendar}>
        {t("actions.calendarView")}
      </button>

      {canCreate ? (
        <button type="button" className="btn-primary" onClick={onNew}>
          {t("actions.newCampaign")}
        </button>
      ) : null}
    </div>
  );
}