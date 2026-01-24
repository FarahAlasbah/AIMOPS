import './FormSection.css';

const FormSection = ({ title, optional = false, children, className = '' }) => {
  return (
    <section className={`form-section ${className}`}>
      {title && (
        <h2 className="section-title">
          {title}
          {optional && <span className="optional-badge">Optional</span>}
        </h2>
      )}
      {children}
    </section>
  );
};

export default FormSection;