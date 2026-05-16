import { AlertCircle } from "lucide-react";

function ActivityHistoryError({ message }) {
  if (!message) return null;

  return (
    <div className="activity-history-error">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
}

export default ActivityHistoryError;