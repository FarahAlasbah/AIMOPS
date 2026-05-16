import ActivityHistoryRow from "./ActivityHistoryRow";

function ActivityHistoryList({ logs, offset, usersById, t, language }) {
  return (
    <div className="activity-history-list">
      {logs.map((log, index) => (
        <ActivityHistoryRow
          key={log?.audit_log_id ?? log?.id ?? `${offset}-${index}`}
          log={log}
          index={index}
          offset={offset}
          usersById={usersById}
          t={t}
          language={language}
        />
      ))}
    </div>
  );
}

export default ActivityHistoryList;