import { useEffect, useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConsultation } from "../hooks/useConsultation";
import { clampTextareaHeight } from "../utils/consultationHelpers";

export default function ConsultationComposer() {
  const { t } = useTranslation("consultation");
  const { draft, setDraft, sendMessage, isSending } = useConsultation();
  const textareaRef = useRef(null);

  useEffect(() => {
    clampTextareaHeight(textareaRef.current);
  }, [draft]);

  const handleSubmit = async () => {
    if (isSending) return;
    await sendMessage(draft);
  };

  const handleKeyDown = async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSubmit();
    }
  };

  return (
    <div className="consultation-composer">
      <textarea
        ref={textareaRef}
        className="consultation-textarea"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("inputPlaceholder")}
        rows={1}
        disabled={isSending}
      />

      <button
        type="button"
        className="consultation-send-button"
        onClick={handleSubmit}
        disabled={isSending || !String(draft || "").trim()}
        aria-label={isSending ? t("sending") : t("send")}
      >
        <SendHorizontal size={18} />
      </button>
    </div>
  );
}
