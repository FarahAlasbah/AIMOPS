import { Card } from "../../../shared/components";

export default function ForecastDetailsPageSkeleton() {
  return (
    <>
      <div className="forecast-details-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="forecast-kpi">
            <div
              className="forecast-details-sk"
              style={{ width: "45%", marginBottom: 10 }}
            />
            <div className="forecast-details-sk" style={{ width: "70%" }} />
          </div>
        ))}
      </div>

      <Card className="forecast-details-card">
        <div className="forecast-meta-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="forecast-meta-item">
              <div
                className="forecast-details-sk"
                style={{ width: "42%", marginBottom: 8 }}
              />
              <div className="forecast-details-sk" style={{ width: "76%" }} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="forecast-details-card">
        <div className="forecast-chart-grid">
          <div className="forecast-chart-card">
            <div
              className="forecast-details-sk"
              style={{ width: "38%", marginBottom: 10 }}
            />
            <div
              className="forecast-details-sk"
              style={{ width: "55%", marginBottom: 14 }}
            />
            <div className="forecast-details-sk-box" />
          </div>

          <div className="forecast-chart-card">
            <div
              className="forecast-details-sk"
              style={{ width: "46%", marginBottom: 10 }}
            />
            <div
              className="forecast-details-sk"
              style={{ width: "52%", marginBottom: 14 }}
            />
            <div className="forecast-details-sk-box" style={{ height: 300 }} />
          </div>
        </div>
      </Card>
    </>
  );
}