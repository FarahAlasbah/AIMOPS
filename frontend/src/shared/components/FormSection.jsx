// frontend/src/shared/components/FormSection.jsx
import { useTranslation } from 'react-i18next';
import './FormSection.css';

const FormSection = ({ title, optional = false, children, className = '' }) => {
  const { t } = useTranslation("common");

  return (
    <section className={`form-section ${className}`}>
      {title && (
        <h2 className="section-title">
          {title}
          {optional && <span className="optional-badge">{t("shared.formSection.optional")}</span>}
        </h2>
      )}
      {children}
    </section>
  );
};

export default FormSection;