// frontend/src/features/data-upload/pages/DataUpload.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  PageHeader,
  Button,
  FormActions,
  FormSelect,
} from "../../../shared/components";
import Stepper from "../../../shared/components/Stepper";
import FileUpload from "../../../shared/components/FileUpload";
import InfoMessage from "../../../shared/components/InfoMessage";
import { uploadSalesData } from "../../../api/data";
import "./DataUpload.css";

const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_EXT = new Set(["csv", "xlsx"]);

// LocalStorage key to remember previously uploaded files (dedupe)
const DEDUPE_STORAGE_KEY = "sales_upload_dedupe_keys_v1";

const getFileKey = (file) => `${file.name}__${file.size}__${file.lastModified}`;

const readDedupeSet = () => {
  try {
    const raw = localStorage.getItem(DEDUPE_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const writeDedupeSet = (set) => {
  localStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const getExt = (filename) => {
  const parts = String(filename).toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

const DataUpload = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Optional: replace this with real campaigns from backend later
  const campaignOptions = useMemo(
    () => [
      { value: "1", label: "Summer Sale 2025" },
      { value: "2", label: "Ramadan Special" },
      { value: "3", label: "Back to School" },
    ],
    []
  );

  const steps = ["Upload", "Map Columns", "Review"];

  const handleFileSelect = (file) => {
    setError("");

    if (!file) {
      setUploadedFile(null);
      return;
    }

    // 1) Extension validation
    const ext = getExt(file.name);
    if (!ALLOWED_EXT.has(ext)) {
      setUploadedFile(null);
      setError("Only .csv and .xlsx files are allowed.");
      return;
    }

    // 2) Size validation
    if (file.size > MAX_BYTES) {
      setUploadedFile(null);
      setError(`File is too large. Max size is ${MAX_MB} MB.`);
      return;
    }

    // 3) Duplicate prevention (name+size+lastModified)
    const fileKey = getFileKey(file);
    const dedupeSet = readDedupeSet();

    if (dedupeSet.has(fileKey)) {
      setUploadedFile(null);
      setError("This file was already uploaded before. Please choose a different file.");
      return;
    }

    setUploadedFile(file);
  };

  const handleUploadAndAnalyze = async () => {
    setError("");

    if (!uploadedFile) {
      setError("Please select a file first.");
      return;
    }

    // If you want campaign selection to be required, uncomment:
    // if (!selectedCampaign) {
    //   setError("Please select a campaign.");
    //   return;
    // }

    try {
      setUploading(true);
      setProgress(0);

      await uploadSalesData({
        file: uploadedFile,
        campaignId: selectedCampaign || undefined,
        onProgress: setProgress,
      });

      // Mark as uploaded to prevent duplicates later
      const dedupeSet = readDedupeSet();
      dedupeSet.add(getFileKey(uploadedFile));
      writeDedupeSet(dedupeSet);

      // Move to next step
      setCurrentStep(2);
    } catch (err) {
      // Basic message extraction (works with axios errors too)
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Upload failed.";

      // If backend returns 409 for duplicate, show a nicer message
      if (err?.response?.status === 409) {
        setError("Duplicate upload detected. This file was already processed.");
      } else {
        setError(String(msg));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setUploadedFile(null);
    setSelectedCampaign("");
    setError("");
    setProgress(0);
    setCurrentStep(1);
  };

  return (
    <div className="data-upload-page">
      <PageHeader
        title="Upload Campaign Sales Data"
        breadcrumbs={[
          { label: "Campaigns", link: true, onClick: () => navigate("/app/campaigns") },
          { label: "Upload Sales Data", link: false },
        ]}
      />

      <Stepper steps={steps} currentStep={currentStep} />

      <Card>
        {error && (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        )}

        {currentStep === 1 && (
          <>
            <FormSelect
              label="Related Campaign (optional)"
              placeholder="Select a campaign..."
              options={campaignOptions}
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            />

            <div style={{ marginTop: 16 }}>
              <FileUpload
                onFileSelect={handleFileSelect}
                accept=".csv,.xlsx"
                maxSize={MAX_MB}
              />
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
              <Button variant="secondary" onClick={handleCancel} disabled={uploading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUploadAndAnalyze}
                disabled={!uploadedFile || uploading}
              >
                Upload & Analyze
              </Button>
            </FormActions>
          </>
        )}

        {currentStep === 2 && (
          <div className="step-placeholder">
            <h3>Step 2: Map Columns</h3>
            <p>Column mapping interface will go here</p>
            <p>Selected file: {uploadedFile?.name}</p>

            <FormActions>
              <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep(3)}>
                Continue to Review
              </Button>
            </FormActions>
          </div>
        )}

        {currentStep === 3 && (
          <div className="step-placeholder">
            <h3>Step 3: Review</h3>
            <p>Review and confirm interface will go here</p>

            <FormActions>
              <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => alert("Data uploaded successfully!")}>
                Confirm & Save
              </Button>
            </FormActions>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DataUpload;
