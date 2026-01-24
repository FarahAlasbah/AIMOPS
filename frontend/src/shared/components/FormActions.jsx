import './FormActions.css';

const FormActions = ({ children, align = 'right' }) => {
  return (
    <div className={`form-actions form-actions-${align}`}>
      {children}
    </div>
  );
};

export default FormActions;