import './Stepper.css';

const Stepper = ({ steps, currentStep }) => {
  return (
    <div className="stepper">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div key={stepNumber} className="stepper-item">
            <div className={`stepper-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
              {isCompleted ? '✓' : stepNumber}
            </div>
            <span className={`stepper-label ${isActive ? 'active' : ''}`}>
              {step}
            </span>
            {stepNumber < steps.length && <div className="stepper-line" />}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;