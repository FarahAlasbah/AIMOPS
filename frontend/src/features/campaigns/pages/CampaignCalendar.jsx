import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card, PageHeader } from "../../../shared/components";

import CampaignCalendarActions from "../components/calendar/CampaignCalendarActions";
import CampaignCalendarGroups from "../components/calendar/CampaignCalendarGroups";
import CampaignCalendarToolbar from "../components/calendar/CampaignCalendarToolbar";
import CalendarCampaignSkeleton from "../components/calendar/CalendarCampaignSkeleton";

import { useCampaignCalendar } from "../hooks/useCampaignCalendar";

import "./CampaignCalendar.css";

const CampaignCalendar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("campaigns");

  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    campaigns,
    groupedCampaigns,
    loading,
    refreshing,
    showSkeleton,
    pageError,
    handleRefresh,
  } = useCampaignCalendar(t);

  return (
    <div className="campaign-calendar-page">
      <PageHeader
        actions={
          <CampaignCalendarActions
            t={t}
            onBack={() => navigate("/app/campaigns")}
          />
        }
      />

      {pageError ? (
        <div className="campaign-page-alert error">{pageError}</div>
      ) : null}

      <Card>
        <CampaignCalendarToolbar
          t={t}
          startDate={startDate}
          endDate={endDate}
          refreshing={refreshing}
          loading={loading}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onRefresh={handleRefresh}
        />
      </Card>

      <Card aria-busy={showSkeleton}>
        {showSkeleton ? (
          <CalendarCampaignSkeleton />
        ) : campaigns.length ? (
          <CampaignCalendarGroups
            t={t}
            groupedCampaigns={groupedCampaigns}
            onView={(campaignId) => navigate(`/app/campaigns/${campaignId}`)}
          />
        ) : (
          <div className="campaign-calendar-empty">
            {t("calendar.noCampaigns")}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CampaignCalendar;