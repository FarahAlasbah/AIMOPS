// frontend/src/shared/pages/Denied.jsx
import { Card, PageHeader } from "../components";
import InfoMessage from "../components/InfoMessage";

export default function Denied() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        title="Access Denied"
        subtitle="You don’t have permission to view that page."
      />
      <Card>
        <InfoMessage type="error">
          Your account doesn’t have the required permissions.
        </InfoMessage>
      </Card>
    </div>
  );
}
