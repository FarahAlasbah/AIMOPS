// frontend/src/features/data-upload/components/UploadStep.jsx
import { useTranslation } from "react-i18next";
import { Button, FormActions, FormSelect } from "../../../shared/components";
import FileUpload from "../../../shared/components/FileUpload";

export default function UploadStep({
  campaignOptions,
  selectedCampaign,
  onCampaignChange,
  onFileSelect,
  uploading,
  progress,
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
      {/* <FormSelect
        label={t("uploadStep.campaignLabel")}
        placeholder={t("uploadStep.campaignPlaceholder")}
        options={campaignOptions}
        value={selectedCampaign}
        onChange={onCampaignChange}
      /> */}

      <div style={{ marginTop: 16 }}>
        <FileUpload
          key={fileInputKey}
          value={selectedFile}
          onFileSelect={onFileSelect}
          accept=".csv,.xlsx"
          maxSize={maxMb}
        />
      </div>

      {uploading && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: "var(--c-text-muted)", marginBottom: 6 }}>
            {t("uploadStep.uploading", { progress })}
          </div>
          <div className="upload-progress">
            <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <FormActions>
        <Button variant="secondary" onClick={onCancel} disabled={uploading}>
          {t("uploadStep.cancel")}
        </Button>
        <Button variant="primary" onClick={onUpload} disabled={!canUpload || uploading}>
          {t("uploadStep.upload")}
        </Button>
      </FormActions>
    </>
  );
}