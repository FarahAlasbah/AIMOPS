export default function CampaignSummaryGrid({ t, summary }) {
  const cards = [
    {
      key: "total",
      label: t("summary.total"),
      value: summary.total,
    },
    {
      key: "published",
      label: t("summary.active", {
        defaultValue: "Published",
      }),
      value: summary.active,
    },
    {
      key: "planned",
      label: t("summary.planned"),
      value: summary.planned,
    },
    {
      key: "completed",
      label: t("summary.completed"),
      value: summary.completed,
    },
  ];

  return (
    <div className="campaign-summary-grid">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`campaign-summary-card campaign-summary-card--${card.key}`}
        >
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
    </div>
  );
}