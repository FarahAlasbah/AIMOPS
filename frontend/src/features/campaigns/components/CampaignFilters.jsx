import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FormSelect } from "../../../shared/components";
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

  const statusOptions = useMemo(
    () =>
      STATUS_FILTERS.map((status) => ({
        value: status,
        label:
          status === "all"
            ? t("filters.allStatuses")
            : t(`status.${status}`),
      })),
    [t],
  );

  const typeOptions = useMemo(
    () => [
      {
        value: "all",
        label: t("filters.allTypes"),
      },
      ...CAMPAIGN_TYPES.map((type) => ({
        value: type,
        label: t(`types.${type}`),
      })),
    ],
    [t],
  );

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
        <FormSelect
          label={t("filters.status")}
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value)}
          options={statusOptions}
        />
      </div>

      <div className="campaign-filter">
        <FormSelect
          label={t("filters.type")}
          value={typeValue}
          onChange={(e) => onTypeChange(e.target.value)}
          options={typeOptions}
        />
      </div>
    </div>
  );
};

export default CampaignFilters;