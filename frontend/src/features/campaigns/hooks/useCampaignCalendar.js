import { useCallback, useEffect, useMemo, useState } from "react";

import { getCampaignCalendar, getCampaigns } from "../../../api/campaigns";
import { getDefaultCalendarRange } from "../utils";
import {
  groupCampaignsByStartDate,
  mergeCampaigns,
  normalizeCampaignList,
  overlapsRange,
  getCampaignStartDate,
  toDateKey,
} from "../utils/campaignCalendarUtils";

export function useCampaignCalendar(t) {
  const defaultRange = getDefaultCalendarRange();

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadCalendar = useCallback(
    async ({ showRefreshing = false } = {}) => {
      if (!startDate || !endDate) return;

      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setPageError("");

      try {
        const [calendarResponse, campaignsResponse] = await Promise.all([
          getCampaignCalendar({ startDate, endDate }).catch(() => null),
          getCampaigns(),
        ]);

        const calendarCampaigns = normalizeCampaignList(calendarResponse);
        const allCampaigns = normalizeCampaignList(campaignsResponse);

        const merged = mergeCampaigns(calendarCampaigns, allCampaigns)
          .filter((campaign) => overlapsRange(campaign, startDate, endDate))
          .sort((a, b) =>
            toDateKey(getCampaignStartDate(a)).localeCompare(
              toDateKey(getCampaignStartDate(b)),
            ),
          );

        setCampaigns(merged);
      } catch (error) {
        setPageError(error.message || t("messages.loadError"));
        setCampaigns([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endDate, startDate, t],
  );

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const groupedCampaigns = useMemo(
    () => groupCampaignsByStartDate(campaigns),
    [campaigns],
  );

  const handleRefresh = () => {
    loadCalendar({ showRefreshing: true });
  };

  const showSkeleton = loading || refreshing;

  return {
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
  };
}