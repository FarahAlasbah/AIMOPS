import { useMemo, useState } from "react";
import { Trash2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConsultationMarkdown from "./ConsultationMarkdown";
import DeleteSummaryModal from "./DeleteSummaryModal";
import { formatConsultationDateTime } from "../utils/consultationHelpers";

export default function ConsultationSummaryCard({ summary, onDelete }) {
  const { t, i18n } = useTranslation("consultation");
  const [expanded, setExpanded] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = useMemo(
    () => formatConsultationDateTime(summary?.created_at, i18n.language),
    [i18n.language, summary?.created_at]
  );

  const plainPreview = useMemo(() => {
    const raw = String(summary?.content || "");
    return raw
      .replace(/[#*_>|`-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);
  }, [summary?.content]);

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await onDelete(summary?.summary_id);
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <article className="consultation-summary-card">
        <button
          type="button"
          className="consultation-summary-main"
          onClick={() => setExpanded((value) => !value)}
        >
          <div className="consultation-summary-icon">
            <FileText size={16} />
          </div>

          <div className="consultation-summary-copy">
            <div className="consultation-summary-topline">
              <h4 className="consultation-summary-title">{summary?.title}</h4>
              <span className="consultation-summary-date">{formattedDate}</span>
            </div>

            <p className="consultation-summary-preview">
              {plainPreview || t("summariesEmpty")}
            </p>
          </div>

          <div className="consultation-summary-chevron">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {expanded ? (
          <div className="consultation-summary-expanded">
            <div className="consultation-summary-markdown">
              <ConsultationMarkdown content={summary?.content || ""} />
            </div>

            <div className="consultation-summary-footer">
              <button
                type="button"
                className="consultation-ghost-danger-button"
                onClick={() => setDeleteModalOpen(true)}
              >
                <Trash2 size={15} />
                <span>{t("deleteSummary")}</span>
              </button>
            </div>
          </div>
        ) : null}
      </article>

      <DeleteSummaryModal
        open={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) setDeleteModalOpen(false);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
}