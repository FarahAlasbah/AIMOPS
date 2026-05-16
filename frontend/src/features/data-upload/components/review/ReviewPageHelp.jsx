import PageHelp from "../../../../shared/components/PageHelp";

export default function ReviewPageHelp({ t }) {
  return (
    <PageHelp
      title={t("reviewPage.help.title")}
      items={[
        {
          title: t("reviewPage.help.items.checkProducts.title"),
          description: t("reviewPage.help.items.checkProducts.description"),
        },
        {
          title: t("reviewPage.help.items.mergeDuplicates.title"),
          description: t("reviewPage.help.items.mergeDuplicates.description"),
        },
        {
          title: t("reviewPage.help.items.watchWarnings.title"),
          description: t("reviewPage.help.items.watchWarnings.description"),
        },
        {
          title: t("reviewPage.help.items.confirmProducts.title"),
          description: t("reviewPage.help.items.confirmProducts.description"),
        },
      ]}
      note={t("reviewPage.help.note")}
    />
  );
}