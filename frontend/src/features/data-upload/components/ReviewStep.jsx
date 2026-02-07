// frontend/src/features/data-upload/components/ReviewStep.jsx
import { Button, FormActions } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

export default function ReviewStep({
  batchId,
  confirming,
  confirmResult,
  processing,
  processResult,
  error,

  onBack,
  onProcess,
  onFinish,
}) {
  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 10 }}>Process</h3>

      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
        Batch ID: <strong style={{ color: "#111827" }}>{batchId}</strong>
      </div>

      {error && (
        <div style={{ marginBottom: 12 }}>
          <InfoMessage type="error">{error}</InfoMessage>
        </div>
      )}

      {confirming && <InfoMessage type="info">Saving mappings...</InfoMessage>}

      {confirmResult?.success && (
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <InfoMessage type="success">
            Mappings saved: {confirmResult.mappings_saved ?? 0}
          </InfoMessage>
        </div>
      )}

      {processing && <InfoMessage type="info">Processing file...</InfoMessage>}

      {processResult?.success && (
        <div style={{ marginTop: 12 }}>
          <div className="mapping-card">
            <div className="mapping-title">Processing result</div>

            <div className="meta-grid" style={{ marginTop: 10 }}>
              <div className="meta-item">
                <div className="meta-label">Total rows</div>
                <div className="meta-value">{processResult?.statistics?.total_rows ?? "-"}</div>
              </div>

              <div className="meta-item">
                <div className="meta-label">Valid rows</div>
                <div className="meta-value">{processResult?.statistics?.valid_rows ?? "-"}</div>
              </div>

              <div className="meta-item">
                <div className="meta-label">Rejected rows</div>
                <div className="meta-value">{processResult?.statistics?.rejected_rows ?? "-"}</div>
              </div>

              <div className="meta-item">
                <div className="meta-label">Success rate</div>
                <div className="meta-value">
                  {typeof processResult?.statistics?.success_rate === "number"
                    ? `${processResult.statistics.success_rate.toFixed(1)}%`
                    : "-"}
                </div>
              </div>

              <div className="meta-item" style={{ gridColumn: "1 / -1" }}>
                <div className="meta-label">Date range</div>
                <div className="meta-value">
                  {processResult?.date_range?.start || "-"} → {processResult?.date_range?.end || "-"}
                </div>
              </div>

              <div className="meta-item" style={{ gridColumn: "1 / -1" }}>
                <div className="meta-label">Time</div>
                <div className="meta-value">
                  {typeof processResult?.processing_time_seconds === "number"
                    ? `${processResult.processing_time_seconds}s`
                    : "-"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <FormActions>
        <Button variant="secondary" onClick={onBack} disabled={confirming || processing}>
          Back
        </Button>

        <Button
          variant="secondary"
          onClick={onProcess}
          disabled={!confirmResult?.success || processing || !!processResult?.success}
        >
          {processing ? "Processing..." : processResult?.success ? "Processed" : "Process"}
        </Button>

        <Button variant="primary" onClick={onFinish} disabled={!processResult?.success}>
          Finish
        </Button>
      </FormActions>
    </div>
  );
}
