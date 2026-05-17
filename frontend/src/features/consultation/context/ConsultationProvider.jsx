import { createContext, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getConsultationHistory,
  sendConsultationMessageStream,
  createConsultationSummary,
  getConsultationSummaries,
  deleteConsultationSummary,
  clearConsultationHistory,
} from "../../../api/consultation";
import {
  createLocalAssistantLoadingMessage,
  createLocalUserMessage,
  mapHistoryResponseToMessages,
  mapSummariesResponse,
} from "../utils/consultationMappers";
import { buildConsultationSummaryTitle } from "../utils/consultationHelpers";
import "../styles/consultation.css";

export const ConsultationContext = createContext(null);

function getConsultationErrorMessage(error, t) {
  const status = error?.response?.status;

  if (status === 503) return t("serviceUnavailable");
  if (status === 504) return t("requestTimedOut");
  if (status === 429) return t("tooManyRequests");

  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    t("unknownError")
  );
}

export function ConsultationProvider({ children }) {
  const { t } = useTranslation("consultation");

  const [messages, setMessages] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [draft, setDraft] = useState("");

  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [isSummariesLoading, setIsSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [isCreatingSummary, setIsCreatingSummary] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [hasLoadedSummaries, setHasLoadedSummaries] = useState(false);

  const [notice, setNotice] = useState(null);

  const sendingRef = useRef(false);
  const clearFlowRef = useRef(false);
  const summariesDeleteRef = useRef(new Set());

  const ensureHistoryLoaded = useCallback(
    async ({ force = false } = {}) => {
      if (isHistoryLoading) return;
      if (!force && hasLoadedHistory) return;

      setIsHistoryLoading(true);
      setHistoryError("");

      try {
        const data = await getConsultationHistory();
        setMessages(mapHistoryResponseToMessages(data));
        setHasLoadedHistory(true);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          t("historyLoadError", {
            defaultValue: "Failed to load conversation.",
          });

        setHistoryError(String(message));
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [hasLoadedHistory, isHistoryLoading, t],
  );

  const ensureSummariesLoaded = useCallback(
    async ({ force = false } = {}) => {
      if (isSummariesLoading) return;
      if (!force && hasLoadedSummaries) return;

      setIsSummariesLoading(true);
      setSummariesError("");

      try {
        const data = await getConsultationSummaries();
        setSummaries(mapSummariesResponse(data));
        setHasLoadedSummaries(true);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          t("summariesLoadError", {
            defaultValue: "Failed to load summaries.",
          });

        setSummariesError(String(message));
      } finally {
        setIsSummariesLoading(false);
      }
    },
    [hasLoadedSummaries, isSummariesLoading, t],
  );

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleDrawerExpanded = useCallback(() => {
    setIsDrawerExpanded((current) => !current);
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const sendMessage = useCallback(
    async (rawMessage) => {
      const message = String(rawMessage || "").trim();

      if (!message || sendingRef.current) return false;

      sendingRef.current = true;
      setIsSending(true);
      setHistoryError("");
      setNotice(null);
      setDraft("");

      const userMessage = createLocalUserMessage(message);

      const assistantMessage = {
        ...createLocalAssistantLoadingMessage(),
        status: "streaming",
        content: "",
      };

      let streamedAnswer = "";

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        await sendConsultationMessageStream(message, {
          onChunk: (chunk) => {
            streamedAnswer += chunk;

            setMessages((prev) =>
              prev.map((item) =>
                item.id === assistantMessage.id
                  ? {
                      ...item,
                      content: streamedAnswer,
                      status: "streaming",
                    }
                  : item,
              ),
            );
          },
        });

        const finalAnswer = streamedAnswer.trim();

        setMessages((prev) =>
          prev.map((item) =>
            item.id === assistantMessage.id
              ? {
                  ...item,
                  content:
                    finalAnswer ||
                    t("emptyAssistantResponse", {
                      defaultValue:
                        "AIMOPS did not return an answer. Please try again.",
                    }),
                  status: "sent",
                }
              : item,
          ),
        );

        /*
          The backend saves the chat after the stream finishes.
          Mark history as stale so the next reload gets the saved backend version.
        */
        setHasLoadedHistory(false);

        return true;
      } catch (error) {
        const errorText = getConsultationErrorMessage(error, t);

        setMessages((prev) =>
          prev.map((item) => {
            if (item.id !== assistantMessage.id) return item;

            return {
              ...item,
              content: streamedAnswer,
              status: "error",
              errorText: t("streamInterrupted", {
                defaultValue:
                  "The answer stopped before it finished. Please try again.",
              }),
            };
          }),
        );

        if (!streamedAnswer.trim()) {
          setMessages((prev) =>
            prev.filter((item) => item.id !== assistantMessage.id),
          );
        }

        setNotice({
          type: "error",
          text: errorText,
        });

        return false;
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    },
    [t],
  );

  const deleteSummary = useCallback(
    async (summaryId) => {
      if (!summaryId) return false;

      try {
        await deleteConsultationSummary(summaryId);

        setSummaries((prev) =>
          prev.filter((item) => item.summary_id !== summaryId),
        );

        setNotice({
          type: "success",
          text: t("summaryDeleted", { defaultValue: "Summary deleted." }),
        });

        return true;
      } catch (error) {
        const errorText =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          t("deleteSummaryError", {
            defaultValue: "Failed to delete summary.",
          });

        setNotice({
          type: "error",
          text: errorText,
        });

        return false;
      }
    },
    [t],
  );

  const saveSummary = useCallback(
    async (title) => {
      const trimmedTitle = String(title || "").trim();
      if (!trimmedTitle || isCreatingSummary) return false;

      setIsCreatingSummary(true);

      try {
        await createConsultationSummary(trimmedTitle);

        setNotice({
          type: "success",
          text: t("summaryCreated"),
        });

        setHasLoadedSummaries(false);
        await ensureSummariesLoaded({ force: true });

        return true;
      } catch (error) {
        const errorText =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          t("summaryError");

        setNotice({
          type: "error",
          text: errorText,
        });

        return false;
      } finally {
        setIsCreatingSummary(false);
      }
    },
    [ensureSummariesLoaded, isCreatingSummary, t],
  );

  const clearConversation = useCallback(
    async ({ shouldCreateSummary = false, summaryTitle = "" } = {}) => {
      if (clearFlowRef.current) return false;

      clearFlowRef.current = true;
      setNotice(null);

      try {
        if (shouldCreateSummary) {
          setIsCreatingSummary(true);

          const nextTitle =
            String(summaryTitle || "").trim() ||
            buildConsultationSummaryTitle(t("summaryDefaultTitle"));

          try {
            const summaryResponse = await createConsultationSummary(nextTitle);
            const createdSummary = summaryResponse?.summary;

            if (createdSummary) {
              setSummaries((current) => [createdSummary, ...current]);
              setHasLoadedSummaries(true);
            }
          } catch (error) {
            const message =
              error?.response?.data?.message ||
              error?.response?.data?.detail ||
              t("summaryError");

            setNotice({
              type: "error",
              text: String(message),
            });

            return false;
          } finally {
            setIsCreatingSummary(false);
          }
        }

        setIsClearing(true);

        try {
          await clearConsultationHistory();
          setMessages([]);
          setHasLoadedHistory(true);

          setNotice({
            type: "success",
            text: t("historyCleared"),
          });

          return true;
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error?.response?.data?.detail ||
            t("clearError");

          setNotice({
            type: "error",
            text: String(message),
          });

          return false;
        } finally {
          setIsClearing(false);
        }
      } finally {
        setIsCreatingSummary(false);
        clearFlowRef.current = false;
      }
    },
    [t],
  );

  const removeSummary = useCallback(
    async (summaryId) => {
      const key = String(summaryId);
      if (summariesDeleteRef.current.has(key)) return false;

      summariesDeleteRef.current.add(key);
      setNotice(null);

      try {
        await deleteConsultationSummary(summaryId);

        setSummaries((current) =>
          current.filter((summary) => String(summary?.summary_id) !== key),
        );

        setNotice({
          type: "success",
          text: t("summaryDeleted", { defaultValue: "Summary deleted." }),
        });

        return true;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          t("summaryDeleteError", {
            defaultValue: "Failed to delete summary.",
          });

        setNotice({
          type: "error",
          text: String(message),
        });

        return false;
      } finally {
        summariesDeleteRef.current.delete(key);
      }
    },
    [t],
  );

  const value = useMemo(
    () => ({
      messages,
      summaries,
      draft,
      setDraft,

      isHistoryLoading,
      historyError,
      isSummariesLoading,
      summariesError,
      isSending,
      isCreatingSummary,
      isClearing,

      isDrawerOpen,
      isDrawerExpanded,
      hasLoadedHistory,
      hasLoadedSummaries,

      notice,
      clearNotice,
      saveSummary,
      deleteSummary,

      ensureHistoryLoaded,
      ensureSummariesLoaded,
      sendMessage,
      clearConversation,
      removeSummary,

      openDrawer,
      closeDrawer,
      toggleDrawerExpanded,
    }),
    [
      messages,
      summaries,
      draft,
      isHistoryLoading,
      historyError,
      isSummariesLoading,
      summariesError,
      isSending,
      isCreatingSummary,
      isClearing,
      isDrawerOpen,
      isDrawerExpanded,
      hasLoadedHistory,
      hasLoadedSummaries,
      notice,
      clearNotice,
      saveSummary,
      deleteSummary,
      ensureHistoryLoaded,
      ensureSummariesLoaded,
      sendMessage,
      clearConversation,
      removeSummary,
      openDrawer,
      closeDrawer,
      toggleDrawerExpanded,
    ],
  );

  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  );
}