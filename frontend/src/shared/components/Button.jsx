import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  type = 'button',
  onClick,
  disabled = false,
  fullWidth = false,
  ...props 
}) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${fullWidth ? 'btn-full-width' : ''}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;