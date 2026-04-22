import { Bot, User } from "lucide-react";
import ConsultationMarkdown from "./ConsultationMarkdown";

export default function ConsultationMessageBubble({ message }) {
  const isUser = message.role === "user";
  const isLoading = message.status === "loading";

  return (
    <div
      className={`consultation-message-row ${
        isUser ? "consultation-message-row-user" : "consultation-message-row-assistant"
      }`}
    >
      {!isUser && (
        <div className="consultation-avatar consultation-avatar-assistant">
          <Bot size={16} />
        </div>
      )}

      <div
        className={`consultation-bubble ${
          isUser ? "consultation-bubble-user" : "consultation-bubble-assistant"
        }`}
      >
        {!isUser && <div className="consultation-bubble-label">AIMOPS AI</div>}

        {isUser ? (
          <div className="consultation-message-text">{message.content}</div>
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

      {isUser && (
        <div className="consultation-avatar consultation-avatar-user">
          <User size={16} />
        </div>
      )}
    </div>
  );
}