// frontend/src/features/dashboard/pages/Dashboard.jsx
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t } = useTranslation("dashboard");

  return (
    <div>
      <h2>{t("stub.title")}</h2>
      <p>{t("stub.body")}</p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginTop: "20px",
      }}>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h3>{t("stub.totalCampaigns")}</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#3498db" }}>12</p>
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h3>{t("stub.activeForecasts")}</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#2ecc71" }}>5</p>
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h3>{t("stub.feedbackItems")}</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#e74c3c" }}>248</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;