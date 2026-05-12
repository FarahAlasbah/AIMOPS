import { HelpCircle, Printer, RefreshCcw } from "lucide-react";

export function ReportsHeaderActions({ onHelp, onRefresh }) {
  return (
    <div className="reports-header-actions">
      <button
        type="button"
        className="reports-help-btn"
        onClick={onHelp}
        aria-label="Open reports help"
        title="How to use this page"
      >
        <HelpCircle size={18} />
      </button>

      <button
        type="button"
        className="reports-btn reports-btn-secondary"
        onClick={onRefresh}
      >
        <RefreshCcw size={16} />
        Refresh
      </button>

      <button
        type="button"
        className="reports-btn reports-btn-secondary"
        onClick={() => window.print()}
      >
        <Printer size={16} />
        Print
      </button>
    </div>
  );
}