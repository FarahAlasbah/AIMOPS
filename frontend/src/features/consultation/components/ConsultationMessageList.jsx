import { useEffect, useRef } from "react";
import ConsultationMessageBubble from "./ConsultationMessageBubble";

export default function ConsultationMessageList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="consultation-message-list">
      {messages.map((message) => (
        <ConsultationMessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}