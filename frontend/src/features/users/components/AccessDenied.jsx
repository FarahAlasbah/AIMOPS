import { Card, PageHeader, InfoMessage } from '../../../shared/components';

const AccessDenied = () => {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Access Denied" />
      <Card>
        <InfoMessage type="error">
          You don't have permission to access this page. Only administrators can manage users.
        </InfoMessage>
      </Card>
    </div>
  );
};

export default AccessDenied;
