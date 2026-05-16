export function ForecastSummarySkeleton() {
  return (
    <div className="forecast-summary-row">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="forecast-summary-card">
          <div className="forecast-sk" style={{ width: "42%", height: 12 }} />
          <div
            className="forecast-sk"
            style={{ width: "58%", height: 30, marginTop: 16 }}
          />
        </div>
      ))}
    </div>
  );
}

export function ForecastControlsSkeleton() {
  return (
    <div className="forecast-controls">
      <div className="forecast-controls-top">
        <div
          className="forecast-sk"
          style={{ width: 130, height: 42, borderRadius: 999 }}
        />
        <div
          className="forecast-sk"
          style={{ width: 42, height: 42, borderRadius: 14 }}
        />
      </div>

      <div className="forecast-search-block">
        <div className="forecast-sk" style={{ width: 90, height: 12 }} />
        <div
          className="forecast-sk"
          style={{
            width: "100%",
            maxWidth: 420,
            height: 42,
            marginTop: 8,
            borderRadius: 12,
          }}
        />
      </div>

      <div className="forecast-filters-block">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="forecast-field">
            <div className="forecast-sk" style={{ width: "36%", height: 12 }} />
            <div
              className="forecast-sk"
              style={{
                width: "100%",
                height: 42,
                marginTop: 8,
                borderRadius: 12,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ForecastTableSkeleton({ rows = 8 }) {
  return (
    <div className="forecast-skeleton-wrap">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="forecast-skeleton-row">
          <div className="forecast-skeleton-stack">
            <div className="forecast-sk" style={{ width: "70%" }} />
            <div className="forecast-sk" style={{ width: "45%" }} />
          </div>

          <div className="forecast-sk" style={{ width: "60%" }} />

          <div className="forecast-skeleton-stack">
            <div className="forecast-sk" style={{ width: "52%" }} />
            <div className="forecast-sk" style={{ width: "78%" }} />
          </div>

          <div className="forecast-sk" style={{ width: "58%" }} />

          <div className="forecast-skeleton-stack">
            <div className="forecast-sk" style={{ width: "72%" }} />
            <div className="forecast-sk" style={{ width: "50%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}