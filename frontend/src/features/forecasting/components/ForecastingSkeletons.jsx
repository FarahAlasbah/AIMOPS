export function ForecastStatsSkeleton() {
  return (
    <div className="forecast-stats-grid">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="forecast-stat-card">
          <div className="forecast-sk" style={{ width: "44%", height: 12 }} />
          <div className="forecast-sk" style={{ width: "60%", height: 24, marginTop: 14 }} />
        </div>
      ))}
    </div>
  );
}

export function ForecastTableSkeleton({ rows = 8 }) {
  return (
    <div className="forecast-table-wrap">
      <table className="forecast-table">
        <thead>
          <tr>
            {Array.from({ length: 5 }).map((_, idx) => (
              <th key={idx}>
                <div className="forecast-sk" style={{ width: "44%", height: 12 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              <td>
                <div className="forecast-sk" style={{ width: "56%", height: 15 }} />
                <div className="forecast-sk" style={{ width: "32%", height: 11, marginTop: 8 }} />
              </td>
              <td><div className="forecast-sk" style={{ width: "54%", height: 14 }} /></td>
              <td><div className="forecast-sk" style={{ width: "68%", height: 14 }} /></td>
              <td><div className="forecast-sk" style={{ width: "48%", height: 14 }} /></td>
              <td><div className="forecast-sk" style={{ width: "120px", height: 36 }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ForecastDetailsSkeleton() {
  return (
    <div className="forecast-detail-body">
      <div className="forecast-detail-kpis">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="forecast-mini-card">
            <div className="forecast-sk" style={{ width: "40%", height: 11 }} />
            <div className="forecast-sk" style={{ width: "62%", height: 20, marginTop: 10 }} />
          </div>
        ))}
      </div>

      <div className="forecast-chart-card">
        <div className="forecast-sk" style={{ width: "28%", height: 16, marginBottom: 18 }} />
        <div className="forecast-sk" style={{ width: "100%", height: 280, borderRadius: 18 }} />
      </div>

      <div className="forecast-chart-card">
        <div className="forecast-sk" style={{ width: "28%", height: 16, marginBottom: 18 }} />
        <div className="forecast-sk" style={{ width: "100%", height: 220, borderRadius: 18 }} />
      </div>
    </div>
  );
}
