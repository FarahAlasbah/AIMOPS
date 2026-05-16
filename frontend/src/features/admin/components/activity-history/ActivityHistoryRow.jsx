import { Clock3, History, UserRound } from "lucide-react";

import {
  formatDate,
  getActionClass,
  getActorName,
  getDetailsText,
  getLogId,
  getLogTime,
  getTargetName,
  humanizeAction,
} from "../../utils/activityHistoryUtils";

function ActivityHistoryRow({ log, index, offset, usersById, t, language }) {
  const actionValue = log?.action || log?.event || log?.type || "";
  const actionLabel = humanizeAction(actionValue, t);
  const actionClass = getActionClass(actionValue);
  const actorName = getActorName(log, usersById, t);
  const targetName = getTargetName(log, usersById, t);
  const detailsText = getDetailsText(log, t);
  const time = formatDate(getLogTime(log), t, language);
  const key = getLogId(log, `${offset}-${index}`);

  return (
    <article className="activity-history-row" key={key}>
      <div className={`activity-history-icon ${actionClass}`}>
        <History size={18} />
      </div>

      <div className="activity-history-main">
        <div className="activity-history-row-top">
          <span className={`activity-action-badge ${actionClass}`}>
            {actionLabel}
          </span>

          <span className="activity-time">
            <Clock3 size={14} />
            {time}
          </span>
        </div>

        <div className="activity-history-people">
          <span>
            <UserRound size={15} />
            <strong>{actorName}</strong>{" "}
            {t("activityHistory.log.performedAction", {
              defaultValue: "performed this action",
            })}
          </span>

          <span className="activity-history-target">
            {t("activityHistory.log.affected", {
              defaultValue: "Affected:",
            })}{" "}
            <strong>{targetName}</strong>
          </span>
        </div>

        <p className="activity-history-details">{detailsText}</p>
      </div>
    </article>
  );
}

export default ActivityHistoryRow;