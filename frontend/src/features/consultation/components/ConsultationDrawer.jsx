// frontend/src/features/consultation/components/ConsultationDrawer.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ConsultationPanel from "./ConsultationPanel";
import { useConsultation } from "../hooks/useConsultation";

const MOBILE_QUERY = "(max-width: 768px)";

function getIsMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

export default function ConsultationDrawer() {
  const { isDrawerOpen, isDrawerExpanded, closeDrawer, ensureHistoryLoaded } =
    useConsultation();

  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);

    const handleChange = (event) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    const previousOverflow = document.body.style.overflow;

    if (isMobile) {
      document.body.style.overflow = "hidden";
    }

    window.addEventListener("keydown", handleKeyDown);
    ensureHistoryLoaded();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDrawer, ensureHistoryLoaded, isDrawerOpen, isMobile]);

  if (!isDrawerOpen) return null;

  return createPortal(
    <div
      className={`consultation-drawer-layer ${
        isMobile
          ? "consultation-drawer-layer-mobile"
          : "consultation-drawer-layer-desktop"
      }`}
    >
      {isMobile ? (
        <button
          type="button"
          className="consultation-drawer-overlay"
          aria-label="Close consultation drawer"
          onClick={closeDrawer}
        />
      ) : null}

      <aside
        className={`consultation-drawer ${isDrawerExpanded ? "expanded" : ""}`}
        role="dialog"
        aria-modal={isMobile ? "true" : "false"}
        aria-label="AI Consultation"
      >
        <ConsultationPanel mode="drawer" />
      </aside>
    </div>,
    document.body,
  );
}