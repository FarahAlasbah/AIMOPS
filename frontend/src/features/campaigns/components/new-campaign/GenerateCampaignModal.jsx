import { useTranslation } from "react-i18next";

import GenerateModalHeader from "./generator/GenerateModalHeader";
import GenerateModeOptions from "./generator/GenerateModeOptions";
import GenerateProductsSection from "./generator/GenerateProductsSection";
import GenerateDatesSection from "./generator/GenerateDatesSection";
import GenerateEventSection from "./generator/GenerateEventSection";
import GenerateModalFooter from "./generator/GenerateModalFooter";
import { useGenerateCampaignModalState } from "./generator/useGenerateCampaignModalState";

import "./GenerateCampaignModal.css";

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

  const modal = useGenerateCampaignModalState({
    isOpen,
    loading,
    startDate,
    endDate,
    availableProducts,
    selectedProducts,
    campaignEvents,
    onClose,
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!modal.canGenerate) return;

    onGenerate({
      mode: modal.mode,
      eventName: modal.selectedEvent?.name || "",
      eventId: modal.selectedEvent?.id || "",
      productIds: modal.draftProductIds,
      targetQuantities: modal.draftTargetQuantities,
      startDate: modal.draftStartDate,
      endDate: modal.draftEndDate,
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
        <GenerateModalHeader t={t} />

        <div className="generate-campaign-modal__body">
          <GenerateModeOptions
            t={t}
            mode={modal.mode}
            loading={loading}
            onModeChange={modal.setMode}
          />

          <div className="generate-campaign-modal__forecast-note">
            {t("generator.dates.optionalWarning", {
              defaultValue:
                "Dates are optional for every suggestion. Leave them empty and AIMOPS will choose a suitable start and end date for you.",
            })}
          </div>

          {modal.needsProducts ? (
            <GenerateProductsSection
              t={t}
              loading={loading}
              sectionRef={modal.productsSectionRef}
              needsTargets={modal.needsTargets}
              draftProductIds={modal.draftProductIds}
              draftTargetQuantities={modal.draftTargetQuantities}
              selectedDraftProducts={modal.selectedDraftProducts}
              filteredProducts={modal.filteredProducts}
              availableProducts={availableProducts}
              productSearch={modal.productSearch}
              onProductSearchChange={modal.setProductSearch}
              onAddProduct={modal.addProduct}
              onRemoveProduct={modal.removeProduct}
              onUpdateTargetQuantity={modal.updateTargetQuantity}
            />
          ) : null}

          {modal.needsDates ? (
            <GenerateDatesSection
              t={t}
              loading={loading}
              sectionRef={modal.datesSectionRef}
              needsTargets={modal.needsTargets}
              draftStartDate={modal.draftStartDate}
              draftEndDate={modal.draftEndDate}
              onStartDateChange={modal.setDraftStartDate}
              onEndDateChange={modal.setDraftEndDate}
            />
          ) : null}

          {modal.needsEvent ? (
            <GenerateEventSection
              t={t}
              loading={loading}
              sectionRef={modal.eventSectionRef}
              selectedEventId={modal.selectedEventId}
              campaignEvents={campaignEvents}
              eventsLoading={eventsLoading}
              eventsError={eventsError}
              onSelectEvent={modal.setSelectedEventId}
              onRefreshEvents={onRefreshEvents}
            />
          ) : null}

          {error ? (
            <div className="generate-campaign-modal__error">{error}</div>
          ) : null}
        </div>

        <GenerateModalFooter
          t={t}
          loading={loading}
          canGenerate={modal.canGenerate}
          onClose={onClose}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}