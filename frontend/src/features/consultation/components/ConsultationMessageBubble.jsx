import { Bot, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConsultationMarkdown from "./ConsultationMarkdown";

export default function ConsultationMessageBubble({ message }) {
  const { t } = useTranslation("consultation");

  const isUser = message.role === "user";
  const isLoading = message.status === "loading";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";
  const hasContent = Boolean(String(message.content || "").trim());

  return (
    <div
      className={`consultation-message-row ${
        isUser
          ? "consultation-message-row-user"
          : "consultation-message-row-assistant"
      }`}
    >
      {!isUser ? (
        <div className="consultation-avatar consultation-avatar-assistant">
          <Bot size={16} />
        </div>
      ) : null}

      <div
        className={`consultation-bubble ${
          isUser ? "consultation-bubble-user" : "consultation-bubble-assistant"
        } ${isStreaming ? "consultation-bubble-streaming" : ""} ${
          isError ? "consultation-bubble-error" : ""
        }`}
        dir="auto"
      >
        {!isUser ? (
          <div className="consultation-bubble-label">
            {t("assistantName")}
          </div>
        ) : null}

        {isUser ? (
          <div className="consultation-message-text" dir="auto">
            {message.content}
          </div>
        ) : isLoading || (isStreaming && !hasContent) ? (
          <div className="consultation-typing">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <>
            <div className="consultation-streaming-content">
              <ConsultationMarkdown content={message.content} />

              {isStreaming ? (
                <span
                  className="consultation-streaming-cursor"
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {isError ? (
              <div className="consultation-stream-error">
                {message.errorText ||
                  t("streamInterrupted", {
                    defaultValue:
                      "The answer stopped before it finished. Please try again.",
                  })}
              </div>
            ) : null}
          </>
        )}
      </div>

      {isUser ? (
        <div className="consultation-avatar consultation-avatar-user">
          <User size={16} />
        </div>
      ) : null}
    </div>
  );
}