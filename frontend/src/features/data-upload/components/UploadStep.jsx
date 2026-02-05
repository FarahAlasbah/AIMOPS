import { Button, FormActions, FormSelect } from "../../../shared/components";
import FileUpload from "../../../shared/components/FileUpload";

export default function UploadStep({
  campaignOptions,
  selectedCampaign,
  onCampaignChange,

  uploadedFile,
  onFileSelect,

  uploading,
  progress,
  maxMb,

  onCancel,
  onUpload,
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
        <FileUpload onFileSelect={onFileSelect} accept=".csv,.xlsx" maxSize={maxMb} />
      </div>

      {uploading && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
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
        <Button variant="primary" onClick={onUpload} disabled={!uploadedFile || uploading}>
          Upload
        </Button>
      </FormActions>
    </>
  );
}
