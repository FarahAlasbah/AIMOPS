import { useTranslation } from "react-i18next";

import { Button, FormActions } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import { MappingStepSkeleton } from "./Skeletons";

import {
  HighConfidenceCard,
  NeedsMappingCard,
  NeedsVerificationCard,
  RequiredMissingCard,
  SuggestedSkipCard,
} from "./mapping/MappingCards";

export default function MappingStep({
  analysisLoading,
  analysis,
  allColumnsOptions,
  columnMap,
  requiredMissingMap,
  alreadyConfirmed,
  onBack,
  onSetRole,
  onConfirmVerified,
  onToggleInclude,
  onPickRequiredMissing,
  canConfirm,
  onConfirm,
  confirming,
}) {
  const { t } = useTranslation("upload");

  if (analysisLoading) {
    return <MappingStepSkeleton />;
  }

  if (!analysis) {
    return <InfoMessage type="info">{t("mapping.noAnalysis")}</InfoMessage>;
  }

  const highConfidence = analysis?.classified?.high_confidence || [];
  const requiredMissing = analysis?.classified?.required_missing || [];
  const needsVerification = analysis?.classified?.needs_verification || [];
  const needsMapping = analysis?.classified?.needs_mapping || [];
  const suggestedSkip = analysis?.classified?.suggested_skip || [];

  const hasAnything =
    highConfidence.length ||
    requiredMissing.length ||
    needsVerification.length ||
    needsMapping.length ||
    suggestedSkip.length;

  return (
    <>
      {!hasAnything ? (
        <InfoMessage type="info">{t("mapping.noColumns")}</InfoMessage>
      ) : null}

      <div className="mapping-section">
        <HighConfidenceCard
          highConfidence={highConfidence}
          columnMap={columnMap}
          onSetRole={onSetRole}
          disabled={alreadyConfirmed}
        />

        <RequiredMissingCard
          requiredMissing={requiredMissing}
          allColumnsOptions={allColumnsOptions}
          requiredMissingMap={requiredMissingMap}
          onPick={onPickRequiredMissing}
          disabled={alreadyConfirmed}
        />

        <NeedsMappingCard
          needsMapping={needsMapping}
          columnMap={columnMap}
          onSetRole={onSetRole}
          disabled={alreadyConfirmed}
        />

        <NeedsVerificationCard
          needsVerification={needsVerification}
          columnMap={columnMap}
          onSetRole={onSetRole}
          onConfirmVerified={onConfirmVerified}
          disabled={alreadyConfirmed}
        />

        <SuggestedSkipCard
          suggestedSkip={suggestedSkip}
          columnMap={columnMap}
          onToggleInclude={onToggleInclude}
          onSetRole={onSetRole}
          disabled={alreadyConfirmed}
        />
      </div>

      <FormActions>
        <Button variant="secondary" onClick={onBack} disabled={!!confirming}>
          {t("mapping.back")}
        </Button>

        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={(!canConfirm && !alreadyConfirmed) || !!confirming}
        >
          {alreadyConfirmed
            ? t("mapping.continue")
            : confirming
              ? t("mapping.confirming")
              : t("mapping.confirmMappings")}
        </Button>
      </FormActions>

      {!alreadyConfirmed && !canConfirm ? (
        <div style={{ marginTop: 12 }}>
          <InfoMessage type="info">{t("mapping.resolveRequired")}</InfoMessage>
        </div>
      ) : null}
    </>
  );
}