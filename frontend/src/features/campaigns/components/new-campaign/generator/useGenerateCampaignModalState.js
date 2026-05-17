import { useEffect, useMemo, useRef, useState } from "react";
import {
  GENERATE_MODES,
  getInitialTargetQuantities,
  hasPositiveQuantity,
} from "./generatorModalUtils";

export function useGenerateCampaignModalState({
  isOpen,
  loading,
  startDate,
  endDate,
  availableProducts = [],
  selectedProducts = [],
  campaignEvents = [],
  onClose,
}) {
  const productsSectionRef = useRef(null);
  const datesSectionRef = useRef(null);
  const eventSectionRef = useRef(null);
  const previousModeRef = useRef("");

  const [mode, setMode] = useState(GENERATE_MODES.FULL);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [draftProductIds, setDraftProductIds] = useState([]);
  const [draftTargetQuantities, setDraftTargetQuantities] = useState({});
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setMode(GENERATE_MODES.FULL);
    setSelectedEventId("");
    setProductSearch("");

    setDraftProductIds(
      selectedProducts
        .map((product) => String(product.product_id))
        .filter(Boolean),
    );

    setDraftTargetQuantities(getInitialTargetQuantities(selectedProducts));
    setDraftStartDate(startDate || "");
    setDraftEndDate(endDate || "");
  }, [isOpen, selectedProducts, startDate, endDate]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  const selectedEvent = useMemo(
    () =>
      campaignEvents.find((event) => String(event.id) === selectedEventId) ||
      null,
    [campaignEvents, selectedEventId],
  );

  const selectedDraftProducts = useMemo(() => {
    const selectedSet = new Set(draftProductIds);

    return availableProducts.filter((product) =>
      selectedSet.has(String(product.id)),
    );
  }, [availableProducts, draftProductIds]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    if (!query) return availableProducts;

    return availableProducts.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const category = String(product.category || "").toLowerCase();

      return name.includes(query) || category.includes(query);
    });
  }, [availableProducts, productSearch]);

  const hasSelectedProducts = draftProductIds.length > 0;

  const needsProducts =
    mode === GENERATE_MODES.PRODUCTS || mode === GENERATE_MODES.TARGETS;

  const needsTargets = mode === GENERATE_MODES.TARGETS;
  const needsEvent = mode === GENERATE_MODES.EVENT;
  const needsDates = mode !== GENERATE_MODES.EVENT;

  const targetQuantitiesReady =
    !needsTargets ||
    (hasSelectedProducts &&
      draftProductIds.every((productId) =>
        hasPositiveQuantity(draftTargetQuantities[String(productId)]),
      ));

  const canGenerate =
    !loading &&
    Boolean(mode) &&
    (!needsProducts || draftProductIds.length > 0) &&
    targetQuantitiesReady &&
    (!needsEvent || Boolean(selectedEvent));

  useEffect(() => {
    if (!isOpen) {
      previousModeRef.current = "";
      return undefined;
    }

    const previousMode = previousModeRef.current;
    previousModeRef.current = mode;

    if (!mode || previousMode === mode) return undefined;

    const sectionToShow = needsEvent
      ? eventSectionRef.current
      : needsProducts
        ? productsSectionRef.current
        : needsDates
          ? datesSectionRef.current
          : null;

    if (!sectionToShow) return undefined;

    const timer = window.setTimeout(() => {
      sectionToShow.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [isOpen, mode, needsDates, needsEvent, needsProducts]);

  const addProduct = (productId) => {
    const safeId = String(productId);

    setDraftProductIds((prev) => {
      if (prev.includes(safeId)) return prev;
      return [...prev, safeId];
    });

    setDraftTargetQuantities((prev) => ({
      ...prev,
      [safeId]: prev[safeId] || "",
    }));
  };

  const removeProduct = (productId) => {
    const safeId = String(productId);

    setDraftProductIds((prev) => prev.filter((id) => id !== safeId));

    setDraftTargetQuantities((prev) => {
      const next = { ...prev };
      delete next[safeId];
      return next;
    });
  };

  const updateTargetQuantity = (productId, value) => {
    const safeId = String(productId);

    setDraftTargetQuantities((prev) => ({
      ...prev,
      [safeId]: value,
    }));
  };

  return {
    mode,
    setMode,

    selectedEventId,
    setSelectedEventId,
    selectedEvent,

    draftProductIds,
    draftTargetQuantities,
    draftStartDate,
    draftEndDate,
    productSearch,

    setDraftStartDate,
    setDraftEndDate,
    setProductSearch,

    selectedDraftProducts,
    filteredProducts,

    needsProducts,
    needsTargets,
    needsEvent,
    needsDates,
    canGenerate,

    productsSectionRef,
    datesSectionRef,
    eventSectionRef,

    addProduct,
    removeProduct,
    updateTargetQuantity,
  };
}