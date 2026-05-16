import { Sparkles } from "lucide-react";
import PageHelp from "../../../../shared/components/PageHelp";

export default function NewCampaignHeaderActions({
  t,
  generating,
  onGenerate,
  onBack,
}) {
  return (
    <div className="new-campaign-top-actions" style={{ marginBottom: 0 }}>
      <PageHelp
        title={t("help.new.title")}
        buttonLabel={t("help.new.buttonLabel")}
        items={[
          {
            title: t("help.new.items.details.title"),
            description: t("help.new.items.details.description"),
          },
          {
            title: t("help.new.items.schedule.title"),
            description: t("help.new.items.schedule.description"),
          },
          {
            title: t("help.new.items.channels.title"),
            description: t("help.new.items.channels.description"),
          },
          {
            title: t("help.new.items.products.title"),
            description: t("help.new.items.products.description"),
          },
          {
            title: t("help.new.items.savePublish.title"),
            description: t("help.new.items.savePublish.description"),
          },
        ]}
        note={t("help.new.note")}
      />

      <button
        type="button"
        className="btn-generate"
        onClick={onGenerate}
        disabled={generating}
      >
        <Sparkles size={16} />
        {generating
          ? t("actions.generating", {
              defaultValue: "Generating...",
            })
          : t("actions.generate", {
              defaultValue: "Generate",
            })}
      </button>

      <button type="button" className="btn-outline" onClick={onBack}>
        {t("actions.backToCampaigns")}
      </button>
    </div>
  );
}