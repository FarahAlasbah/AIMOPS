import { Button, FormActions } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

export default function ReviewStep({ batchId, submitWarning, onBack, onFinish }) {
  return (
    <div className="step-placeholder">
      <h3>Review</h3>
      <p>Mapping was saved locally for this batch.</p>
      <p>Batch ID: {batchId}</p>

      {submitWarning && (
        <div style={{ marginTop: 12 }}>
          <InfoMessage type="info">{submitWarning}</InfoMessage>
        </div>
      )}

      <FormActions>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onFinish}>
          Finish
        </Button>
      </FormActions>
    </div>
  );
}
