import { useTranslation } from "react-i18next";
import "./CampaignStatusBadge.css";

const CampaignStatusBadge = ({ status }) => {
  const { t } = useTranslation("campaigns");
  const normalized = (status || "planned").toLowerCase();

  return (
    <span className={`campaign-status-badge ${normalized}`}>
      {t(`status.${normalized}`, { defaultValue: normalized })}
    </span>
  );
};

export default CampaignStatusBadge;