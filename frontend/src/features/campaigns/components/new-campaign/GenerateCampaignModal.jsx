import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FormCalendar } from "../../../../shared/components";
import { formatEventOptionLabel } from "../../utils/campaignEventUtils";

import "./GenerateCampaignModal.css";

const GENERATE_MODES = {
  FULL: "full",
  PRODUCTS: "products",
  PRODUCTS_WITH_DATES: "products_with_dates",
  EVENT: "event",
  CLEARANCE: "clearance",
};

function GenerateMiniLoader({ t }) {
  return (
    <div className="generate-campaign-modal__mini-loader" aria-live="polite">
      <span className="generate-campaign-modal__spinner" />

      <span>
        {t("generator.loadingShort", {
          defaultValue: "Generating suggestion...",
        })}
      </span>
    </div>
  );
}

export default function GenerateCampaignModal({
  isOpen,
  loading,
  error,
  startDate,
  endDate,
  availableProducts = [],
  selectedProducts = [],
  campaignEvents = [],
  eventsLoading = false,
  eventsError = "",
  onRefreshEvents,
  onClose,
  onGenerate,
}) {
  const { t } = useTranslation("campaigns");

  const [mode, setMode] = useState(GENERATE_MODES.FULL);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [draftProductIds, setDraftProductIds] = useState([]);
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
  const hasDateRange = Boolean(draftStartDate && draftEndDate);

  const options = useMemo(
    () => [
      {
        value: GENERATE_MODES.FULL,
        title: t("generator.full.title", {
          defaultValue: "Full suggestion",
        }),
        description: t("generator.full.description", {
          defaultValue:
            "Let AIMOPS choose the products, dates, campaign type, and details.",
        }),
        helper: t("generator.full.helper", {
          defaultValue: "Best when the system should decide everything.",
        }),
      },
      {
        value: GENERATE_MODES.PRODUCTS,
        title: t("generator.products.title", {
          defaultValue: "Use selected products",
        }),
        description: t("generator.products.description", {
          defaultValue:
            "Choose products here, then AIMOPS will generate a campaign idea for them.",
        }),
        helper: hasSelectedProducts
          ? t("generator.products.ready", {
              count: draftProductIds.length,
              defaultValue: `${draftProductIds.length} product(s) selected.`,
            })
          : t("generator.products.pickInsideModal", {
              defaultValue: "Choose products below before generating.",
            }),
      },
      {
        value: GENERATE_MODES.PRODUCTS_WITH_DATES,
        title: t("generator.productsWithDates.title", {
          defaultValue: "Use selected products and dates",
        }),
        description: t("generator.productsWithDates.description", {
          defaultValue:
            "Choose products and dates here, then AIMOPS will generate the suggestion.",
        }),
        helper:
          hasSelectedProducts && hasDateRange
            ? t("generator.productsWithDates.ready", {
                defaultValue: "Products and dates are ready.",
              })
            : t("generator.productsWithDates.pickInsideModal", {
                defaultValue: "Choose products and dates below.",
              }),
      },
      {
        value: GENERATE_MODES.EVENT,
        title: t("generator.event.title", {
          defaultValue: "Based on an event",
        }),
        description: t("generator.event.description", {
          defaultValue:
            "Generate a campaign suggestion around one of the confirmed events.",
        }),
        helper: t("generator.event.helper", {
          defaultValue:
            "Choose an existing event below. AIMOPS will use that event name.",
        }),
      },
      {
        value: GENERATE_MODES.CLEARANCE,
        title: t("generator.clearance.title", {
          defaultValue: "Clearance / slow stock",
        }),
        description: t("generator.clearance.description", {
          defaultValue:
            "Find products that need a push and generate a campaign for them.",
        }),
        helper: t("generator.clearance.helper", {
          defaultValue: "Best for moving slow-selling products.",
        }),
      },
    ],
    [draftProductIds.length, hasDateRange, hasSelectedProducts, t],
  );

  if (!isOpen) return null;

  const needsProducts =
    mode === GENERATE_MODES.PRODUCTS ||
    mode === GENERATE_MODES.PRODUCTS_WITH_DATES;

  const needsDates = mode === GENERATE_MODES.PRODUCTS_WITH_DATES;
  const needsEvent = mode === GENERATE_MODES.EVENT;

  const canGenerate =
    !loading &&
    (!needsProducts || draftProductIds.length > 0) &&
    (!needsDates || (draftStartDate && draftEndDate)) &&
    (!needsEvent || Boolean(selectedEvent));

  const addProduct = (productId) => {
    const safeId = String(productId);

    setDraftProductIds((prev) => {
      if (prev.includes(safeId)) return prev;
      return [...prev, safeId];
    });
  };

  const removeProduct = (productId) => {
    const safeId = String(productId);
    setDraftProductIds((prev) => prev.filter((id) => id !== safeId));
  };

  const handleSubmit = () => {
    if (!canGenerate) return;

    onGenerate({
      mode,
      eventName: selectedEvent?.name || "",
      eventId: selectedEvent?.id || "",
      productIds: draftProductIds,
      startDate: draftStartDate,
      endDate: draftEndDate,
    });
  };

  return (
    <div
      className="generate-campaign-modal__overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        className="generate-campaign-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-campaign-title"
      >
        <div className="generate-campaign-modal__header">
          <div className="generate-campaign-modal__icon">
            <Sparkles size={22} />
          </div>

          <div>
            <h3 id="generate-campaign-title">
              {t("generator.title", {
                defaultValue: "Generate campaign suggestion",
              })}
            </h3>

            <p>
              {t("generator.subtitle", {
                defaultValue:
  "Choose how AIMOPS should build the campaign idea. AIMOPS will fill the form, complete what is missing, and you can still edit everything before saving.",
              })}
            </p>
          </div>
        </div>

        <div className="generate-campaign-modal__body">
          <div className="generate-campaign-modal__options">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`generate-option-card ${
                  mode === option.value ? "active" : ""
                } ${loading ? "is-loading" : ""}`}
                onClick={() => {
                  if (!loading) {
                    setMode(option.value);
                  }
                }}
                disabled={loading}
              >
                <span className="generate-option-card__title">
                  {option.title}
                </span>

                <span className="generate-option-card__description">
                  {option.description}
                </span>

                <span className="generate-option-card__helper">
                  {option.helper}
                </span>
              </button>
            ))}
          </div>

          {needsProducts ? (
            <div className="generate-campaign-modal__section">
              <div className="generate-campaign-modal__section-header">
                <div>
                  <h4>
                    {t("generator.products.selectTitle", {
                      defaultValue: "Choose products",
                    })}
                  </h4>

                  <p>
                    {t("generator.products.selectSubtitle", {
                      defaultValue:
                        "Pick the products you want AIMOPS to focus on.",
                    })}
                  </p>
                </div>

                <span className="generate-campaign-modal__counter">
                  {draftProductIds.length}
                </span>
              </div>

              {selectedDraftProducts.length ? (
                <div className="generate-campaign-modal__selected-products">
                  {selectedDraftProducts.map((product) => (
                    <span
                      key={product.id}
                      className="generate-campaign-modal__selected-chip"
                    >
                      <span>{product.name}</span>

                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        disabled={loading}
                        aria-label={t("actions.remove", {
                          defaultValue: "Remove",
                        })}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="generate-campaign-modal__hint">
                  {t("generator.products.selectedHint", {
                    defaultValue:
                      "Selected products will appear here. Use the Add button to include a product.",
                  })}
                </div>
              )}

              <div className="generate-campaign-modal__search">
                <Search size={16} />

                <input
                  type="text"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder={t("fields.productsSearchPlaceholder", {
                    defaultValue: "Search products...",
                  })}
                  disabled={loading}
                />
              </div>

              {filteredProducts.length ? (
                <div className="generate-campaign-modal__product-list">
                  {filteredProducts.map((product) => {
                    const isSelected = draftProductIds.includes(
                      String(product.id),
                    );

                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={`generate-campaign-modal__product-card ${
                          isSelected ? "active" : ""
                        }`}
                        onClick={() => {
                          if (!isSelected) addProduct(product.id);
                        }}
                        disabled={loading}
                      >
                        <span className="generate-campaign-modal__product-meta">
                          <span className="generate-campaign-modal__product-name">
                            {product.name}
                          </span>

                          <span className="generate-campaign-modal__product-category">
                            {product.category || "-"}
                          </span>
                        </span>

                        <span className="generate-campaign-modal__product-action">
                          {isSelected
                            ? t("generator.products.added", {
                                defaultValue: "Added",
                              })
                            : t("actions.add", {
                                defaultValue: "Add",
                              })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="generate-campaign-modal__notice">
                  {availableProducts.length
                    ? t("generator.products.noMatchingProducts", {
                        defaultValue: "No products match your search.",
                      })
                    : t("generator.products.noProducts", {
                        defaultValue:
                          "No products were found. Add products first, then generate a campaign from them.",
                      })}
                </div>
              )}
            </div>
          ) : null}

          {needsDates ? (
            <div className="generate-campaign-modal__section">
              <div className="generate-campaign-modal__section-header">
                <div>
                  <h4>
                    {t("generator.dates.selectTitle", {
                      defaultValue: "Choose campaign dates",
                    })}
                  </h4>

                  <p>
                    {t("generator.dates.selectSubtitle", {
                      defaultValue:
                        "Pick the date range AIMOPS should use for this suggestion.",
                    })}
                  </p>
                </div>
              </div>

              <div className="generate-campaign-modal__date-grid">
                <FormCalendar
                  label={t("fields.startDate")}
                  value={draftStartDate}
                  onChange={(event) => setDraftStartDate(event.target.value)}
                  disabled={loading}
                  required
                />

                <FormCalendar
                  label={t("fields.endDate")}
                  value={draftEndDate}
                  min={draftStartDate || undefined}
                  onChange={(event) => setDraftEndDate(event.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          ) : null}

          {needsEvent ? (
            <div className="generate-campaign-modal__section">
              <div className="generate-campaign-modal__section-header">
                <div>
                  <h4>
                    {t("generator.event.selectTitle", {
                      defaultValue: "Select an event",
                    })}
                  </h4>

                  <p>
                    {t("generator.event.selectSubtitle", {
                      defaultValue:
                        "This list comes from the confirmed events in your project.",
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  className="generate-campaign-modal__refresh"
                  onClick={onRefreshEvents}
                  disabled={loading || eventsLoading}
                >
                  {eventsLoading
                    ? t("actions.loading", {
                        defaultValue: "Loading...",
                      })
                    : t("actions.refresh", {
                        defaultValue: "Refresh",
                      })}
                </button>
              </div>

              {eventsLoading ? (
                <div className="generate-campaign-modal__notice">
                  {t("generator.event.loading", {
                    defaultValue: "Loading events...",
                  })}
                </div>
              ) : null}

              {eventsError ? (
                <div className="generate-campaign-modal__notice error">
                  {eventsError}
                </div>
              ) : null}

              {!eventsLoading && !eventsError && !campaignEvents.length ? (
                <div className="generate-campaign-modal__notice">
                  {t("generator.event.noEvents", {
                    defaultValue:
                      "No confirmed events were found. Add or confirm an event first, then come back to generate a campaign from it.",
                  })}
                </div>
              ) : null}

              {!eventsLoading && campaignEvents.length ? (
                <div className="generate-campaign-modal__event-list">
                  {campaignEvents.map((event) => {
                    const isSelected = String(event.id) === selectedEventId;

                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={`generate-campaign-modal__event-card ${
                          isSelected ? "active" : ""
                        }`}
                        onClick={() => setSelectedEventId(String(event.id))}
                        disabled={loading}
                      >
                        <span className="generate-campaign-modal__event-name">
                          {event.name}
                        </span>

                        <span className="generate-campaign-modal__event-date">
                          {formatEventOptionLabel(event)}
                        </span>

                        {event.type ? (
                          <span className="generate-campaign-modal__event-type">
                            {event.type}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="generate-campaign-modal__error">{error}</div>
          ) : null}
        </div>

        <div className="generate-campaign-modal__footer">
          <div className="generate-campaign-modal__footer-status">
            {loading ? <GenerateMiniLoader t={t} /> : null}
          </div>

          <div className="generate-campaign-modal__footer-actions">
            <button
              type="button"
              className="generate-campaign-modal__button generate-campaign-modal__button--secondary"
              onClick={onClose}
              disabled={loading}
            >
              {t("actions.cancel")}
            </button>

            <button
              type="button"
              className="generate-campaign-modal__button generate-campaign-modal__button--primary"
              onClick={handleSubmit}
              disabled={!canGenerate}
            >
              {loading
                ? t("actions.generating", {
                    defaultValue: "Generating...",
                  })
                : t("actions.generate", {
                    defaultValue: "Generate",
                  })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}