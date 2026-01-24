import './StepBadge.css';

const StepBadge = ({ number, title }) => {
  return (
    <div className="step-badge">
      <div className="step-badge-number">{number}</div>
      <h3 className="step-badge-title">{title}</h3>
    </div>
  );
};

export default StepBadge;