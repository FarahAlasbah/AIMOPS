import PageHelp from "../../../../shared/components/PageHelp";

export default function MappingPageHelp({ t }) {
  return (
    <PageHelp
      title={t("mappingPage.help.title")}
      items={[
        {
          title: t("mappingPage.help.items.reviewRoles.title"),
          description: t("mappingPage.help.items.reviewRoles.description"),
        },
        {
          title: t("mappingPage.help.items.confirmUncertain.title"),
          description: t("mappingPage.help.items.confirmUncertain.description"),
        },
        {
          title: t("mappingPage.help.items.fixRequired.title"),
          description: t("mappingPage.help.items.fixRequired.description"),
        },
        {
          title: t("mappingPage.help.items.skipIrrelevant.title"),
          description: t("mappingPage.help.items.skipIrrelevant.description"),
        },
      ]}
      note={t("mappingPage.help.note")}
    />
  );
}