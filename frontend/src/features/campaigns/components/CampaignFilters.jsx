import { useTranslation } from "react-i18next";
import { CAMPAIGN_TYPES, STATUS_FILTERS } from "../utils";
import "./CampaignFilters.css";

const CampaignFilters = ({
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  typeValue,
  onTypeChange,
}) => {
  const { t } = useTranslation("campaigns");

  return (
    <div className="campaign-filters">
      <div className="campaign-filter search">
        <label>{t("filters.search")}</label>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("filters.searchPlaceholder")}
        />
      </div>

      <div className="campaign-filter">
        <label>{t("filters.status")}</label>
        <select
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status === "all"
                ? t("filters.allStatuses")
                : t(`status.${status}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="campaign-filter">
        <label>{t("filters.type")}</label>
        <select value={typeValue} onChange={(e) => onTypeChange(e.target.value)}>
          <option value="all">{t("filters.allTypes")}</option>
          {CAMPAIGN_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default CampaignFilters;