import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ConsultationMarkdown({ content }) {
  return (
    <div className="consultation-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}