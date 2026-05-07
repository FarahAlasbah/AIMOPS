// frontend/src/features/data-upload/components/UploadStep.jsx
import { useTranslation } from "react-i18next";
import { Button, FormActions } from "../../../shared/components";
import FileUpload from "../../../shared/components/FileUpload";

export default function UploadStep({
  onFileSelect,
  uploading,
  maxMb,
  onCancel,
  onUpload,
  fileInputKey,
  canUpload,
  selectedFile,
}) {
  const { t } = useTranslation("upload");

  return (
    <>
      <div style={{ marginTop: 16 }}>
        <FileUpload
          key={fileInputKey}
          value={selectedFile}
          onFileSelect={onFileSelect}
          accept=".csv,.xlsx"
          maxSize={maxMb}
        />
      </div>

      <FormActions>
        <Button variant="secondary" onClick={onCancel} disabled={uploading}>
          {t("uploadStep.cancel")}
        </Button>

        <Button
          variant="primary"
          onClick={onUpload}
          disabled={!canUpload || uploading}
        >
          {uploading
            ? t("uploadStep.uploadingButton", {
                defaultValue: "Uploading...",
              })
            : t("uploadStep.upload")}
        </Button>
      </FormActions>
    </>
  );
}