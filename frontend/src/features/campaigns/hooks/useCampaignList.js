import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteCampaign,
  getCampaigns,
  publishCampaign,
} from "../../../api/campaigns";

export function useCampaignList(t) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [busyAction, setBusyAction] = useState("");

  const [searchValue, setSearchValue] = useState("");
  const [statusValue, setStatusValue] = useState("all");
  const [typeValue, setTypeValue] = useState("all");

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    action: "",
    campaignId: null,
  });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await getCampaigns();
      setCampaigns(Array.isArray(response?.campaigns) ? response.campaigns : []);
    } catch (error) {
      setPageError(error.message || t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const filteredCampaigns = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesSearch =
        !query ||
        campaign.campaign_name?.toLowerCase().includes(query) ||
        campaign.campaign_type?.toLowerCase().includes(query) ||
        campaign.status?.toLowerCase().includes(query);

      const matchesStatus =
        statusValue === "all" || campaign.status === statusValue;

      const matchesType =
        typeValue === "all" || campaign.campaign_type === typeValue;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [campaigns, searchValue, statusValue, typeValue]);

  const summary = useMemo(
    () => ({
      total: campaigns.length,
      active: campaigns.filter((item) => item.status === "active").length,
      planned: campaigns.filter((item) => item.status === "planned").length,
      completed: campaigns.filter((item) => item.status === "completed").length,
    }),
    [campaigns],
  );

  const openConfirmModal = (action, campaignId) => {
    setConfirmState({
      isOpen: true,
      action,
      campaignId,
    });
  };

  const closeConfirmModal = () => {
    if (busyAction) return;

    setConfirmState({
      isOpen: false,
      action: "",
      campaignId: null,
    });
  };

  const resetConfirmModal = () => {
    setConfirmState({
      isOpen: false,
      action: "",
      campaignId: null,
    });
  };

  const handlePublish = async (campaignId) => {
    setBusyId(campaignId);
    setBusyAction("publish");

    try {
      await publishCampaign(campaignId);

      setCampaigns((prev) =>
        prev.map((item) =>
          item.campaign_id === campaignId
            ? { ...item, status: "active" }
            : item,
        ),
      );

      resetConfirmModal();
    } catch (error) {
      setPageError(error.message || t("messages.publishError"));
    } finally {
      setBusyId(null);
      setBusyAction("");
    }
  };

  const handleDelete = async (campaignId) => {
    setBusyId(campaignId);
    setBusyAction("delete");

    try {
      await deleteCampaign(campaignId);

      setCampaigns((prev) =>
        prev.filter((item) => item.campaign_id !== campaignId),
      );

      resetConfirmModal();
    } catch (error) {
      setPageError(error.message || t("messages.deleteError"));
    } finally {
      setBusyId(null);
      setBusyAction("");
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState.campaignId) return;

    if (confirmState.action === "publish") {
      await handlePublish(confirmState.campaignId);
      return;
    }

    if (confirmState.action === "delete") {
      await handleDelete(confirmState.campaignId);
    }
  };

  const confirmTitle =
    confirmState.action === "publish"
      ? t("dialogs.publishTitle")
      : t("dialogs.deleteTitle");

  const confirmMessage =
    confirmState.action === "publish"
      ? t("messages.confirmPublish")
      : t("messages.confirmDelete");

  const confirmLabel =
    confirmState.action === "publish"
      ? busyAction === "publish" && busyId === confirmState.campaignId
        ? t("actions.publishing")
        : t("actions.publish")
      : busyAction === "delete" && busyId === confirmState.campaignId
        ? t("actions.deleting")
        : t("actions.delete");

  const confirmLoading =
    (confirmState.action === "publish" &&
      busyAction === "publish" &&
      busyId === confirmState.campaignId) ||
    (confirmState.action === "delete" &&
      busyAction === "delete" &&
      busyId === confirmState.campaignId);

  return {
    campaigns,
    filteredCampaigns,
    summary,
    loading,
    pageError,
    busyId,
    busyAction,

    searchValue,
    setSearchValue,
    statusValue,
    setStatusValue,
    typeValue,
    setTypeValue,

    confirmState,
    confirmTitle,
    confirmMessage,
    confirmLabel,
    confirmLoading,

    loadCampaigns,
    openConfirmModal,
    closeConfirmModal,
    handleConfirmAction,
  };
}