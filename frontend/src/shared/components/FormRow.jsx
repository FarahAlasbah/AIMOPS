import './FormRow.css';

const FormRow = ({ children, columns = 2 }) => {
  return (
    <div 
      className="form-row" 
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {children}
    </div>
  );
};

export default FormRow;