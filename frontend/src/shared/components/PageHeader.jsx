import './PageHeader.css';

const PageHeader = ({ 
  breadcrumbs = [], 
  title, 
  subtitle,
  actions 
}) => {
  return (
    <div className="page-header">
      {breadcrumbs.length > 0 && (
        <div className="breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {crumb.link ? (
                <span 
                  className="breadcrumb-link" 
                  onClick={crumb.onClick}
                >
                  {crumb.label}
                </span>
              ) : (
                <span className="breadcrumb-current">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="breadcrumb-separator"> &gt; </span>
              )}
            </span>
          ))}
        </div>
      )}
      
      <div className="page-header-content">
        <div className="page-header-text">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div className="page-header-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;