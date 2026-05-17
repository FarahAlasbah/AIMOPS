// frontend/src/features/campaigns/components/new-campaign/generator/GenerateEventSection.jsx
import { formatEventOptionLabel } from "../../../utils/campaignEventUtils";

export default function GenerateEventSection({
  t,
  loading,
  sectionRef,
  selectedEventId,
  campaignEvents,
  eventsLoading,
  eventsError,
  onSelectEvent,
  onRefreshEvents,
}) {
  return (
    <div ref={sectionRef} className="generate-campaign-modal__section">
      <div className="generate-campaign-modal__section-header">
        <div>
          <h4>{t("generator.event.selectTitle")}</h4>
          <p>{t("generator.event.selectSubtitle")}</p>
        </div>

        <button
          type="button"
          className="generate-campaign-modal__refresh"
          onClick={onRefreshEvents}
          disabled={loading || eventsLoading}
        >
          {eventsLoading ? t("actions.loading") : t("actions.refresh")}
        </button>
      </div>

      {eventsLoading ? (
        <div className="generate-campaign-modal__notice">
          {t("generator.event.loading")}
        </div>
      ) : null}

      {eventsError ? (
        <div className="generate-campaign-modal__notice error">
          {eventsError}
        </div>
      ) : null}

      {!eventsLoading && !eventsError && !campaignEvents.length ? (
        <div className="generate-campaign-modal__notice">
          {t("generator.event.noEvents")}
        </div>
      ) : null}

      {!eventsLoading && campaignEvents.length ? (
        <div className="generate-campaign-modal__event-list">
          {campaignEvents.map((event) => {
            const isSelected = String(event.id) === selectedEventId;

            return (
              <button
                key={event.id}
                type="button"
                className={`generate-campaign-modal__event-card ${
                  isSelected ? "active" : ""
                }`}
                onClick={() => onSelectEvent(String(event.id))}
                disabled={loading}
              >
                <span className="generate-campaign-modal__event-name">
                  {event.name}
                </span>

                <span className="generate-campaign-modal__event-date">
                  {formatEventOptionLabel(event)}
                </span>

                {event.type ? (
                  <span className="generate-campaign-modal__event-type">
                    {event.type}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}