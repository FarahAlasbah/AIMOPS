import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, Card, FormActions, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import MappingStep from "../components/MappingStep";
import { AnalyzeProgress } from "../components/Skeletons";
import MappingPageHelp from "../components/mapping/MappingPageHelp";

import { useMappingPage } from "../hooks/useMappingPage";

export default function MappingPage() {
  const { t } = useTranslation("upload");
  const navigate = useNavigate();
  const { batchId } = useParams();

  const {
    error,
    analysisLoading,
    analysis,
    analyzePct,
    columnMap,
    requiredMissingMap,
    confirming,
    alreadyConfirmed,
    completedNotice,
    allColumnsOptions,
    canConfirm,

    setRole,
    confirmVerified,
    toggleInclude,
    setRequiredMissing,
    handleConfirm,
  } = useMappingPage({ batchId, navigate, t });

  return (
    <div className="data-upload-page">
      <PageHeader actions={<MappingPageHelp t={t} />} />

      <Card>
        {error ? (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="error">{error}</InfoMessage>
          </div>
        ) : null}

        {alreadyConfirmed && !completedNotice ? (
          <div style={{ marginBottom: 16 }}>
            <InfoMessage type="success">
              {t("mappingPage.alreadyConfirmedInfo")}
            </InfoMessage>
          </div>
        ) : null}

        {completedNotice ? (
          <>
            <InfoMessage type="success">
              <strong>{t("mappingPage.completedNoticeTitle")}</strong>
              <br />
              {t("mappingPage.completedNoticeMessage")}
            </InfoMessage>

            <FormActions>
              <Button
                variant="secondary"
                onClick={() => navigate("/app/data-upload/uploads")}
              >
                {t("mappingPage.backToUploads")}
              </Button>

              <Button variant="primary" onClick={() => navigate("/app/products")}>
                {t("mappingPage.viewProducts")}
              </Button>
            </FormActions>
          </>
        ) : analysisLoading ? (
          <AnalyzeProgress percent={analyzePct} />
        ) : (
          <MappingStep
            analysisLoading={false}
            analysis={analysis}
            allColumnsOptions={allColumnsOptions}
            columnMap={columnMap}
            requiredMissingMap={requiredMissingMap}
            alreadyConfirmed={alreadyConfirmed}
            onBack={() => navigate("/app/data-upload/uploads")}
            onSetRole={setRole}
            onConfirmVerified={confirmVerified}
            onToggleInclude={toggleInclude}
            onPickRequiredMissing={setRequiredMissing}
            canConfirm={canConfirm}
            onConfirm={handleConfirm}
            confirming={confirming}
          />
        )}
      </Card>
    </div>
  );
}