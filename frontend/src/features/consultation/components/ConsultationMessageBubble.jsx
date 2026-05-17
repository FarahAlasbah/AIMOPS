import { Bot, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConsultationMarkdown from "./ConsultationMarkdown";

export default function ConsultationMessageBubble({ message }) {
  const { t } = useTranslation("consultation");

  const isUser = message.role === "user";
  const isLoading = message.status === "loading";

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
        ) : isLoading ? (
          <div className="consultation-typing">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <ConsultationMarkdown content={message.content} />
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