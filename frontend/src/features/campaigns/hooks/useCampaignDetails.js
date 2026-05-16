import { useCallback, useEffect, useState } from "react";

import {
  deleteCampaign,
  getCampaignById,
  publishCampaign,
} from "../../../api/campaigns";
import { normalizeCampaignResponse } from "../utils";

export function useCampaignDetails({ campaignId, navigate, t }) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [confirmAction, setConfirmAction] = useState("");

  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;

    setLoading(true);
    setPageError("");

    try {
      const response = await getCampaignById(campaignId);
      setCampaign(normalizeCampaignResponse(response));
    } catch (error) {
      setPageError(error.message || t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [campaignId, t]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const closeConfirmModal = () => {
    if (busyAction) return;
    setConfirmAction("");
  };

  const handlePublish = async () => {
    setBusyAction("publish");

    try {
      await publishCampaign(campaignId);
      setCampaign((prev) => ({
        ...prev,
        status: "active",
      }));
      setConfirmAction("");
    } catch (error) {
      setPageError(error.message || t("messages.publishError"));
    } finally {
      setBusyAction("");
    }
  };

  const handleDelete = async () => {
    setBusyAction("delete");

    try {
      await deleteCampaign(campaignId);
      navigate("/app/campaigns");
    } catch (error) {
      setPageError(error.message || t("messages.deleteError"));
    } finally {
      setBusyAction("");
    }
  };

  const handleConfirmAction = async () => {
    if (confirmAction === "publish") {
      await handlePublish();
      return;
    }

    if (confirmAction === "delete") {
      await handleDelete();
    }
  };

  const confirmTitle =
    confirmAction === "publish"
      ? t("dialogs.publishTitle")
      : t("dialogs.deleteTitle");

  const confirmMessage =
    confirmAction === "publish"
      ? t("messages.confirmPublish")
      : t("messages.confirmDelete");

  const confirmLabel =
    confirmAction === "publish"
      ? busyAction === "publish"
        ? t("actions.publishing")
        : t("actions.publish")
      : busyAction === "delete"
        ? t("actions.deleting")
        : t("actions.delete");

  const confirmLoading =
    (confirmAction === "publish" && busyAction === "publish") ||
    (confirmAction === "delete" && busyAction === "delete");

  return {
    campaign,
    loading,
    pageError,
    busyAction,
    confirmAction,
    confirmTitle,
    confirmMessage,
    confirmLabel,
    confirmLoading,

    setConfirmAction,
    closeConfirmModal,
    handleConfirmAction,
  };
}