import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  PageHeader,
  Button,
  FormActions
} from '../../../shared/components';
import Stepper from '../../../shared/components/Stepper';
import FileUpload from '../../../shared/components/FileUpload';
import './DataUpload.css';

const DataUpload = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);

  const steps = ['Upload', 'Map Columns', 'Review'];

  const handleFileSelect = (file) => {
    setUploadedFile(file);
  };

  const handleUploadAndAnalyze = () => {
    if (!uploadedFile) {
      alert('Please select a file first');
      return;
    }

    // TODO: Send file to backend for analysis
    console.log('Uploading file:', uploadedFile);
    
    // Move to next step
    setCurrentStep(2);
  };

  const handleCancel = () => {
    setUploadedFile(null);
    setCurrentStep(1);
    // Or navigate back
    // navigate('/admin/data-sources');
  };

  return (
    <div className="data-upload-page">
      <PageHeader
        title="Upload Historical Sales Data"
        breadcrumbs={[
          { label: 'Data Sources', link: true, onClick: () => navigate('/admin/data-sources') },
          { label: 'Upload Sales Data', link: false }
        ]}
      />

      <Stepper steps={steps} currentStep={currentStep} />

      <Card>
        {currentStep === 1 && (
          <>
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".csv,.xlsx,.xls"
              maxSize={10}
            />

            <FormActions>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUploadAndAnalyze}
                disabled={!uploadedFile}
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
              <Button variant="primary" onClick={() => alert('Data uploaded successfully!')}>
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