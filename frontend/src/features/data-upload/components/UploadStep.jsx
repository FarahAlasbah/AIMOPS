// frontend/src/features/data-upload/components/UploadStep.jsx
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
  return (
    <>
      <FormSelect
        label="Related Campaign (optional)"
        placeholder="Select a campaign..."
        options={campaignOptions}
        value={selectedCampaign}
        onChange={onCampaignChange}
      />

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
            Uploading... {progress}%
          </div>
          <div className="upload-progress">
            <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <FormActions>
        <Button variant="secondary" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onUpload} disabled={!canUpload || uploading}>
          Upload
        </Button>
      </FormActions>
    </>
  );
}
