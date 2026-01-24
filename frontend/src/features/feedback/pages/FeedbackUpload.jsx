import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  PageHeader,
  Button,
  FormActions,
  FormSelect
} from '../../../shared/components';
import StepBadge from '../../../shared/components/StepBadge';
import FileUpload from '../../../shared/components/FileUpload';
import InfoMessage from '../../../shared/components/InfoMessage';
import './FeedbackUpload.css';

const FeedbackUpload = () => {
  const navigate = useNavigate();
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  const campaignOptions = [
    { value: 'summer-sale', label: 'Summer Sale 2025' },
    { value: 'ramadan', label: 'Ramadan Special' },
    { value: 'back-to-school', label: 'Back to School' },
    { value: 'black-friday', label: 'Black Friday Campaign' }
  ];

  const handleFileSelect = (file) => {
    setUploadedFile(file);
  };

  const handleImportFeedback = () => {
    if (!uploadedFile) {
      alert('Please upload a file first');
      return;
    }

    // TODO: Send to backend
    console.log('Importing feedback:', {
      campaign: selectedCampaign,
      file: uploadedFile
    });

    alert('Feedback imported successfully!');
    navigate('/admin/feedback');
  };

  const handleDownloadTemplate = () => {
    // TODO: Generate and download template file
    console.log('Downloading template...');
    alert('Template download will be implemented');
  };

  const breadcrumbs = [
    { label: 'Feedback', link: true, onClick: () => navigate('/admin/feedback') },
    { label: 'Upload Feedback', link: false }
  ];

  return (
    <div className="feedback-upload-page">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Upload Feedback"
        subtitle="Upload customer comments collected from social media to analyze sentiment and recurring issues."
      />

      <Card>
        {/* Step 1: Select Campaign */}
        <div className="upload-section">
          <StepBadge number="1" title="Select Campaign" />

          <div className="form-group-inline">
            <FormSelect
              label="Related Campaign"
              placeholder="Select a Campaign......"
              options={campaignOptions}
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              required
            />
          </div>

          <InfoMessage type="info">
            Choose the campaign this feedback relates to for better context in analysis.
          </InfoMessage>
        </div>

        {/* Step 2: Upload File */}
        <div className="upload-section">
          <StepBadge number="2" title="Upload Feedback File" />

          <FileUpload
            onFileSelect={handleFileSelect}
            accept=".csv,.xlsx,.xls"
            maxSize={10}
          />

          <div className="template-download">
            <p>Supported formats: CSV, XLSX</p>
            <button
              type="button"
              className="link-button"
              onClick={handleDownloadTemplate}
            >
              📥 Download Simple feedback template
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <FormActions>
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/feedback')}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImportFeedback}
            disabled={!uploadedFile}
          >
            Import Feedback
          </Button>
        </FormActions>
      </Card>
    </div>
  );
};

export default FeedbackUpload;