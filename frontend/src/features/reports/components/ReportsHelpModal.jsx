import { FileText, X } from "lucide-react";

export function ReportsHelpModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="reports-help-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Reports help"
      onClick={onClose}
    >
      <div
        className="reports-help-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reports-help-header">
          <div>
            <div className="reports-help-eyebrow">Page guide</div>
            <h3>How to use Reports</h3>
          </div>

          <button
            type="button"
            className="reports-help-close"
            onClick={onClose}
            aria-label="Close reports help"
          >
            <X size={18} />
          </button>
        </div>

        <div className="reports-help-body">
          <div className="reports-help-item">
            <strong>1. Choose a report period</strong>
            <p>
              Use the preset filter to select the date range you want to
              analyze, such as the last 30, 90, or 180 days.
            </p>
          </div>

          <div className="reports-help-item">
            <strong>2. Read the summary cards first</strong>
            <p>
              Start with total revenue, quantity sold, products sold, campaigns,
              forecast models, and uploads.
            </p>
          </div>

          <div className="reports-help-item">
            <strong>3. Check charts and tables</strong>
            <p>
              Use the trend chart, top products, campaign impact, forecast
              readiness, upload activity, and tables to understand what is
              performing well.
            </p>
          </div>

          <div className="reports-help-note">
            <FileText size={17} />
            <span>
              You can print the report or export product and campaign tables as
              CSV files.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}