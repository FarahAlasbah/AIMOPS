// frontend/src/features/events/components/Skeletons.jsx
import "./Skeletons.css";

export function EventsListSkeleton() {
  return (
    <div className="sk-wrap">
      <div className="sk-row">
        <div className="sk sk-title" />
        <div className="sk sk-chip" />
        <div className="sk sk-chip" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="sk-line">
          <div className="sk sk-wide" />
          <div className="sk sk-mid" />
          <div className="sk sk-mid" />
          <div className="sk sk-mid" />
        </div>
      ))}
    </div>
  );
}

export function EventDetailsSkeleton() {
  return (
    <div className="sk-wrap">
      <div className="sk sk-block" />
      <div style={{ height: 16 }} />
      <div className="sk sk-block" />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="sk-wrap">
      <div className="sk sk-calendar-head" />
      <div className="sk-grid">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className="sk sk-cell" />
        ))}
      </div>
    </div>
  );
}