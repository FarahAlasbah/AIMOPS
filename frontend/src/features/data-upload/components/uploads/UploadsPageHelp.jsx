import PageHelp from "../../../../shared/components/PageHelp";

export default function UploadsPageHelp({ t }) {
  return (
    <PageHelp
      title={t("uploadsPage.help.title")}
      items={[
        {
          title: t("uploadsPage.help.items.uploadFile.title"),
          description: t("uploadsPage.help.items.uploadFile.description"),
        },
        {
          title: t("uploadsPage.help.items.checkUploads.title"),
          description: t("uploadsPage.help.items.checkUploads.description"),
        },
        {
          title: t("uploadsPage.help.items.continueWorkflow.title"),
          description: t("uploadsPage.help.items.continueWorkflow.description"),
        },
        {
          title: t("uploadsPage.help.items.completedUploads.title"),
          description: t("uploadsPage.help.items.completedUploads.description"),
        },
        {
          title: t("uploadsPage.help.items.deleteCarefully.title"),
          description: t("uploadsPage.help.items.deleteCarefully.description"),
        },
      ]}
      note={t("uploadsPage.help.note")}
    />
  );
}