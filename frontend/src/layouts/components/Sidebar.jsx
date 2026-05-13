// frontend/src/layouts/components/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const { t } = useTranslation("common");

  const menuItems = [
    { key: "overview", path: "/dashboard", icon: "📊" },
    { key: "campaigns", path: "/campaigns", icon: "📢" },
    { key: "dataUpload", path: "/data-upload", icon: "📤" },
    { key: "forecasting", path: "/forecasting", icon: "📈" },
    { key: "feedback", path: "/feedback", icon: "💬" },
    { key: "events", path: "/events", icon: "📅" },
    { key: "reports", path: "/reports", icon: "📋" },
    { key: "settings", path: "/admin", icon: "⚙️" }
  ];

  return (
    <aside
      style={{
        width: isOpen ? "250px" : "0",
        height: "100vh",
        backgroundColor: "#2c3e50",
        color: "white",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "width 0.3s ease",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "20px" }}>
        <h2 style={{ margin: "0 0 30px 0", fontSize: "24px" }}>
          {t("appName")}
        </h2>

        <nav>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                margin: "4px 0",
                textDecoration: "none",
                color: "white",
                backgroundColor:
                  location.pathname === item.path ? "#34495e" : "transparent",
                borderRadius: "8px",
                transition: "background-color 0.2s",
              }}
            >
              <span style={{ marginRight: "12px", fontSize: "20px" }}>
                {item.icon}
              </span>
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;