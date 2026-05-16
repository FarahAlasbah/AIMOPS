import PageHelp from "../../../../shared/components/PageHelp";

export default function CampaignCalendarActions({ t, onBack }) {
  return (
    <div className="campaign-calendar-top-actions" style={{ marginBottom: 0 }}>
      <PageHelp
        title={t("help.calendar.title")}
        buttonLabel={t("help.calendar.buttonLabel")}
        items={[
          {
            title: t("help.calendar.items.range.title"),
            description: t("help.calendar.items.range.description"),
          },
          {
            title: t("help.calendar.items.grouping.title"),
            description: t("help.calendar.items.grouping.description"),
          },
          {
            title: t("help.calendar.items.status.title"),
            description: t("help.calendar.items.status.description"),
          },
          {
            title: t("help.calendar.items.productsBudget.title"),
            description: t("help.calendar.items.productsBudget.description"),
          },
          {
            title: t("help.calendar.items.details.title"),
            description: t("help.calendar.items.details.description"),
          },
        ]}
        note={t("help.calendar.note")}
      />

      <button type="button" className="btn-outline" onClick={onBack}>
        {t("actions.backToCampaigns")}
      </button>
    </div>
  );
}