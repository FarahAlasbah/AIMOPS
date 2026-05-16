export default function CalendarCampaignSkeleton({ count = 3 }) {
  return (
    <div className="calendar-cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="calendar-campaign-card">
          <div className="calendar-campaign-top">
            <div className="calendar-skeleton-stack">
              <div className="calendar-sk" style={{ width: 190, height: 18 }} />
              <div className="calendar-sk" style={{ width: 120, height: 13 }} />
            </div>

            <div className="calendar-sk calendar-sk-pill" />
          </div>

          <div className="calendar-campaign-grid">
            {Array.from({ length: 4 }).map((__, itemIndex) => (
              <div key={itemIndex}>
                <div
                  className="calendar-sk"
                  style={{ width: "46%", height: 12, marginBottom: 10 }}
                />
                <div
                  className="calendar-sk"
                  style={{ width: "70%", height: 15 }}
                />
              </div>
            ))}
          </div>

          <div className="calendar-skeleton-products">
            <div className="calendar-sk" style={{ width: 100, height: 13 }} />
            <div className="calendar-skeleton-chip-row">
              <div className="calendar-sk calendar-sk-chip" />
              <div className="calendar-sk calendar-sk-chip" />
              <div className="calendar-sk calendar-sk-chip" />
            </div>
          </div>

          <div className="calendar-campaign-actions">
            <div
              className="calendar-sk"
              style={{ width: 82, height: 44, borderRadius: 12 }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}