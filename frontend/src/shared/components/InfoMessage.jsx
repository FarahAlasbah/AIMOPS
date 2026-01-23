import './InfoMessage.css';

const InfoMessage = ({ children, type = 'info' }) => {
  const icons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✕'
  };

  return (
    <div className={`info-message info-message-${type}`}>
      <span className="info-message-icon">{icons[type]}</span>
      <p className="info-message-text">{children}</p>
    </div>
  );
};

export default InfoMessage;