// frontend/src/shared/components/PageHelp.jsx
import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import "./PageHelp.css";

export default function PageHelp({
  title = "How to use this page",
  eyebrow = "Page guide",
  items = [],
  note = "",
  buttonLabel = "Open page help",
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="page-help-btn"
        onClick={() => setOpen(true)}
        aria-label={buttonLabel}
        title="How to use this page"
      >
        <HelpCircle size={18} />
      </button>

      {open && (
        <div
          className="page-help-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="page-help-modal">
            <div className="page-help-header">
              <div>
                <div className="page-help-eyebrow">{eyebrow}</div>
                <h3>{title}</h3>
              </div>

              <button
                type="button"
                className="page-help-close"
                onClick={() => setOpen(false)}
                aria-label="Close help"
              >
                <X size={18} />
              </button>
            </div>

            <div className="page-help-body">
              {items.map((item, index) => (
                <div className="page-help-item" key={`${item.title}-${index}`}>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              ))}

              {note ? <div className="page-help-note">{note}</div> : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}