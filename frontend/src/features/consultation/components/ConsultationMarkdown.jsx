import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ConsultationMarkdown({ content }) {
  return (
    <div className="consultation-markdown" dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className="consultation-table-scroll">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}